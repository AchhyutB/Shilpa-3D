#!/usr/bin/env python3
"""
Shilpa3D Pipeline - HARDENED FOR LIVE DEMO
- Streams subprocess output live (no more "hangs" that are actually silent buffering)
- Fails LOUD and FAST on missing tools/deps instead of limping to a fake "done"
- Auto-installs Gaussian Splatting (with submodules) if missing
- Logs every checkpoint the moment it's written
- Everything also written to <session>/pipeline.log for post-mortem
- NeRF: exports a .ply point cloud (like Gaussian) + PSNR/SSIM/LPIPS via ns-eval
- Gaussian: trains with --eval split + runs metrics.py for PSNR/SSIM/LPIPS

Usage:
  python pipeline.py <session_id> <statue_name> <method> [quick]
    method: nerf | gaussian | both
    quick:  optional 4th arg literal 'quick' -> tiny iteration counts for a smoke test
"""

import sys, os, json, subprocess, glob, shutil, time, threading
import numpy as np, math
from pathlib import Path
from datetime import datetime

LOG_FILE = None

def log(msg, level="INFO"):
    line = f"[{datetime.now().strftime('%H:%M:%S')}] [{level}] {msg}"
    print(line, flush=True)
    if LOG_FILE:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")

def status(session_dir, stage, pct):
    os.makedirs(session_dir, exist_ok=True)
    with open(f'{session_dir}/status.json', 'w') as f:
        json.dump({'stage': stage, 'percent': pct, 'updated': datetime.now().isoformat()}, f)
    log(f"STAGE -> {stage} ({pct}%)", "STAGE")

def run(cmd, timeout=3600, cwd=None, watch_dir=None, watch_pattern=None):
    """
    Run a shell command, STREAMING stdout/stderr live line-by-line instead of
    buffering (which is what made the old pipeline look 'hung').
    Optionally watches a directory for new files matching a pattern (checkpoints)
    and logs them the moment they appear.
    """
    log(f"RUN: {cmd}" + (f"  (cwd={cwd})" if cwd else ""))
    start = time.time()

    seen_files = set()
    if watch_dir and watch_pattern:
        seen_files = set(glob.glob(os.path.join(watch_dir, watch_pattern), recursive=True))

    proc = subprocess.Popen(
        cmd, shell=True, cwd=cwd,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, bufsize=1
    )

    stop_watch = threading.Event()

    def watcher():
        while not stop_watch.is_set():
            if watch_dir and watch_pattern:
                current = set(glob.glob(os.path.join(watch_dir, watch_pattern), recursive=True))
                new = current - seen_files
                for f in new:
                    try:
                        mb = os.path.getsize(f) / (1024 * 1024)
                        log(f"CHECKPOINT SAVED: {f} ({mb:.1f} MB)", "CKPT")
                    except OSError:
                        pass
                    seen_files.add(f)
            time.sleep(5)

    wt = threading.Thread(target=watcher, daemon=True)
    wt.start()

    last_line_time = time.time()
    timed_out = False
    try:
        for line in proc.stdout:
            print(f"    | {line.rstrip()}", flush=True)
            if LOG_FILE:
                with open(LOG_FILE, "a") as f:
                    f.write(f"    | {line}")
            last_line_time = time.time()
            if time.time() - start > timeout:
                timed_out = True
                proc.kill()
                break
        proc.wait(timeout=30)
    except subprocess.TimeoutExpired:
        timed_out = True
        proc.kill()
    finally:
        stop_watch.set()

    elapsed = time.time() - start
    if timed_out:
        log(f"TIMEOUT after {elapsed:.0f}s: {cmd}", "ERROR")
        return False
    if proc.returncode != 0:
        log(f"FAILED (exit {proc.returncode}) after {elapsed:.0f}s: {cmd}", "ERROR")
        return False
    log(f"OK ({elapsed:.0f}s): {cmd}")
    return True

def which(binary):
    return shutil.which(binary)

def preflight_checks(method):
    """Fail loud and immediately if required tools are missing, instead of
    discovering it 40 minutes into a run."""
    log("=== PRE-FLIGHT CHECKS ===")
    problems = []

    if not which("colmap"):
        problems.append("colmap not found on PATH. Install: apt-get install -y colmap")
    else:
        log(f"colmap found: {which('colmap')}")

    if method in ("nerf", "both"):
        if not which("ns-train"):
            problems.append("ns-train not found on PATH. Install: pip install nerfstudio")
        else:
            log(f"ns-train found: {which('ns-train')}")
        try:
            import torch
            log(f"torch {torch.__version__}, CUDA available: {torch.cuda.is_available()}")
            if not torch.cuda.is_available():
                log("No CUDA GPU visible to torch. NeRF training will be extremely slow or fail.", "WARN")
        except ImportError:
            problems.append("torch not importable in this Python environment.")

    if method in ("gaussian", "both"):
        try:
            import torch
            if not torch.cuda.is_available():
                log("No CUDA GPU visible to torch. Gaussian Splatting CANNOT run without CUDA.", "WARN")
        except ImportError:
            problems.append("torch not importable in this Python environment.")

    if problems:
        log("PRE-FLIGHT FAILED:", "ERROR")
        for p in problems:
            log(f"  - {p}", "ERROR")
        return False
    log("=== PRE-FLIGHT OK ===")
    return True

def ensure_gaussian_splatting(gs_root="/content/gaussian-splatting"):
    """Auto-clone (with submodules) and build Gaussian Splatting if it isn't
    already present and working. This is the step that was MISSING entirely
    from the old pipeline.py, causing the silent 'couldn't fetch dependencies'
    failure when /content got wiped by a runtime restart."""
    if os.path.exists(os.path.join(gs_root, "train.py")):
        log(f"Gaussian Splatting already present at {gs_root}")
        # verify submodules actually built, not just cloned
        try:
            import diff_gaussian_rasterization  # noqa
            import simple_knn  # noqa
            log("Gaussian Splatting submodules import OK")
            return True
        except ImportError:
            log("Gaussian Splatting cloned but submodules not built. Rebuilding...", "WARN")
    else:
        log("Gaussian Splatting not found. Cloning fresh (with submodules)...")
        parent = os.path.dirname(gs_root)
        os.makedirs(parent, exist_ok=True)
        if os.path.exists(gs_root):
            shutil.rmtree(gs_root)
        if not run(f"git clone --recursive https://github.com/graphdeco-inria/gaussian-splatting {gs_root}",
                    timeout=600):
            log("Clone failed. Check network access to github.com.", "ERROR")
            return False

    # lpips is required by metrics.py (PSNR/SSIM/LPIPS eval) - install it here
    # alongside the CUDA submodules so it's available before training starts.
    if not run("pip install --break-system-packages -q submodules/diff-gaussian-rasterization "
               "submodules/simple-knn lpips", cwd=gs_root, timeout=900):
        log("Submodule build failed. Common cause: nvcc/CUDA toolkit mismatch with installed torch build.", "ERROR")
        return False

    try:
        import diff_gaussian_rasterization  # noqa
        import simple_knn  # noqa
        log("Gaussian Splatting build verified OK")
        return True
    except ImportError as e:
        log(f"Gaussian Splatting still not importable after build: {e}", "ERROR")
        return False

def convert_colmap_to_nerf(colmap_sparse, nerf_data):
    sparse_txt = f'{colmap_sparse.replace("/0", "")}/sparse_text'
    os.makedirs(sparse_txt, exist_ok=True)

    if not run(f'colmap model_converter --input_path {colmap_sparse} --output_path {sparse_txt} --output_type TXT',
               timeout=600):
        return False

    def qvec2rotmat(qvec):
        return np.array([
            [1 - 2*qvec[2]**2 - 2*qvec[3]**2, 2*qvec[1]*qvec[2] - 2*qvec[0]*qvec[3], 2*qvec[3]*qvec[1] + 2*qvec[0]*qvec[2]],
            [2*qvec[1]*qvec[2] + 2*qvec[0]*qvec[3], 1 - 2*qvec[1]**2 - 2*qvec[3]**2, 2*qvec[2]*qvec[3] - 2*qvec[0]*qvec[1]],
            [2*qvec[3]*qvec[1] - 2*qvec[0]*qvec[2], 2*qvec[2]*qvec[3] + 2*qvec[0]*qvec[1], 1 - 2*qvec[1]**2 - 2*qvec[2]**2]
        ])

    frames = []
    images_file = Path(sparse_txt) / "images.txt"

    if not images_file.exists():
        log(f"images.txt not found at {images_file}", "ERROR")
        return False

    with open(images_file) as f:
        lines = [l for l in f if l.strip() and not l.startswith("#")]

    # STRICT 2-lines-per-image stepping (pose line + feature line) - this was
    # the duplicate-frame-counting bug you already fixed. Kept here on purpose.
    i = 0
    while i < len(lines):
        parts = lines[i].split()
        if len(parts) < 10:
            i += 1
            continue
        try:
            qw, qx, qy, qz = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])
            tx, ty, tz = float(parts[5]), float(parts[6]), float(parts[7])
            image_name = parts[9]

            R = qvec2rotmat(np.array([qw, qx, qy, qz]))
            t_nerf = np.array([tx, ty * -1, tz * -1])

            c2w = np.eye(4)
            c2w[:3, :3] = R
            c2w[:3, 3] = t_nerf

            frames.append({"file_path": f"images/{image_name}", "transform_matrix": c2w.tolist()})
        except (ValueError, IndexError) as e:
            log(f"Skipping malformed pose line: {e}", "WARN")
        i += 2  # skip the feature-points line that follows every pose line

    if not frames:
        log("No frames parsed from images.txt", "ERROR")
        return False

    cameras_file = Path(sparse_txt) / "cameras.txt"
    if not cameras_file.exists():
        log(f"cameras.txt not found at {cameras_file}", "ERROR")
        return False

    width = height = fx = fy = cx = cy = None
    with open(cameras_file) as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            parts = line.split()
            width, height = int(parts[2]), int(parts[3])
            fx = fy = float(parts[4])
            cx, cy = float(parts[5]), float(parts[6])
            break

    if width is None:
        log("Could not parse camera intrinsics from cameras.txt", "ERROR")
        return False

    output = {
        "camera_angle_x": 2 * math.atan(width / (2 * fx)),
        "camera_angle_y": 2 * math.atan(height / (2 * fy)),
        "fl_x": fx, "fl_y": fy, "cx": cx, "cy": cy,
        "w": width, "h": height,
        "frames": frames
    }

    with open(f'{nerf_data}/transforms.json', 'w') as f:
        json.dump(output, f, indent=2)

    log(f"transforms.json written: {len(frames)} frames")
    return True

def main():
    if len(sys.argv) < 4:
        print('Usage: python pipeline.py <session_id> <statue_name> <method> [quick]')
        sys.exit(1)

    sid, statue, method = sys.argv[1], sys.argv[2], sys.argv[3]
    quick = len(sys.argv) > 4 and sys.argv[4] == 'quick'

    NERF_ITERS = 300 if quick else 30000
    NERF_SAVE_EVERY = 100 if quick else 5000
    GS_ITERS = 300 if quick else 15000

    ROOT = os.environ.get('SHILPA_SESSIONS_DIR', '/content/drive/MyDrive/shilpa3D/sessions')
    SDIR = f'{ROOT}/{sid}'
    IMGS = f'{SDIR}/images'
    COLMAP = f'{SDIR}/colmap'
    NDATA = f'{SDIR}/nerf_data'
    NOUT = f'{SDIR}/nerf_out'
    GOUT = f'{SDIR}/gaussian_out'
    RES = f'{SDIR}/results'
    DB = f'{COLMAP}/database.db'

    global LOG_FILE
    os.makedirs(SDIR, exist_ok=True)
    LOG_FILE = f'{SDIR}/pipeline.log'
    open(LOG_FILE, 'a').write(f"\n\n===== RUN START {datetime.now().isoformat()} "
                               f"(session={sid}, statue={statue}, method={method}, quick={quick}) =====\n")

    os.environ['QT_QPA_PLATFORM'] = 'offscreen'

    log(f"Session: {sid} | Statue: {statue} | Method: {method} | Quick: {quick}")
    log(f"Log file: {LOG_FILE}")

    try:
        if not preflight_checks(method):
            raise Exception("Pre-flight checks failed - see errors above. Fix these before running, "
                             "do NOT let this proceed into a multi-hour run that will fail anyway.")

        status(SDIR, 'validating', 5)
        if not os.path.exists(IMGS):
            raise Exception(f"No images at {IMGS}")

        images = [f for f in os.listdir(IMGS) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        log(f"Found {len(images)} images")
        if len(images) < 10:
            raise Exception(f"Need 10+ images, found {len(images)}")

        for d in [f'{COLMAP}/sparse', NDATA, NOUT, GOUT, RES]:
            os.makedirs(d, exist_ok=True)

        # clean stale DB from a previous interrupted run
        if os.path.exists(DB):
            log("Removing stale database.db from previous run", "WARN")
            os.remove(DB)

        # COLMAP
        status(SDIR, 'colmap_features', 10)
        if not run(f'colmap feature_extractor --database_path {DB} --image_path {IMGS} '
                   f'--ImageReader.single_camera 1 --ImageReader.camera_model SIMPLE_PINHOLE '
                   f'--SiftExtraction.use_gpu 0', timeout=600):
            raise Exception("COLMAP feature extraction failed - see log above for exact error")

        status(SDIR, 'colmap_matching', 25)
        matcher = 'exhaustive_matcher' if len(images) <= 100 else 'sequential_matcher'
        extra = '' if matcher == 'exhaustive_matcher' else '--SequentialMatching.overlap 10'
        if not run(f'colmap {matcher} --database_path {DB} {extra} --SiftMatching.use_gpu 0',
                   timeout=1800):
            raise Exception("COLMAP feature matching failed")

        status(SDIR, 'colmap_mapper', 40)
        if not run(f'colmap mapper --database_path {DB} --image_path {IMGS} --output_path {COLMAP}/sparse',
                   timeout=1800):
            raise Exception("COLMAP mapper failed")

        if not os.path.exists(f'{COLMAP}/sparse/0'):
            raise Exception("COLMAP reconstruction produced no sparse/0 - registration likely failed "
                             "(check image overlap/blur)")
        log("COLMAP sparse reconstruction OK: sparse/0 exists")

        # NeRF
        if method in ['nerf', 'both']:
            status(SDIR, 'nerf_convert', 50)
            if not convert_colmap_to_nerf(f'{COLMAP}/sparse/0', NDATA):
                log("NeRF conversion FAILED - skipping NeRF, continuing to Gaussian if requested", "ERROR")
            else:
                # copy images where nerfstudio expects them
                nerf_imgs = f'{NDATA}/images'
                os.makedirs(nerf_imgs, exist_ok=True)
                try:
                    from PIL import Image, ImageOps
                    for im in images:
                        src = os.path.join(IMGS, im)
                        dst = os.path.join(nerf_imgs, im)
                        if not os.path.exists(dst):
                            # Bake EXIF rotation into pixels so dimensions match
                            # what COLMAP reported (fixes worker IndexError seen
                            # with phone photos that carry EXIF orientation tags)
                            img = Image.open(src)
                            img = ImageOps.exif_transpose(img)
                            img.save(dst)
                    log(f"Copied {len(images)} images to {nerf_imgs} (EXIF-normalized)")
                except ImportError:
                    for im in images:
                        src = os.path.join(IMGS, im)
                        dst = os.path.join(nerf_imgs, im)
                        if not os.path.exists(dst):
                            shutil.copy(src, dst)
                    log(f"Copied {len(images)} images to {nerf_imgs} (PIL unavailable, no EXIF fix)", "WARN")

                status(SDIR, 'nerf_training', 60)
                nerf_ok = run(
                    f'ns-train nerfacto --data {NDATA} --output-dir {NOUT} '
                    f'--max-num-iterations {NERF_ITERS} --steps-per-save {NERF_SAVE_EVERY} --vis tensorboard',
                    timeout=1800 if quick else 10800,
                    watch_dir=NOUT, watch_pattern='**/*.ckpt'
                )
                if not nerf_ok:
                    log("NeRF training FAILED or timed out", "ERROR")
                else:
                    cfgs = glob.glob(f'{NOUT}/**/config.yml', recursive=True)
                    ckpts = glob.glob(f'{NOUT}/**/*.ckpt', recursive=True)
                    log(f"NeRF training finished. Checkpoints found: {len(ckpts)}")
                    for c in ckpts:
                        log(f"  {c} ({os.path.getsize(c)/1e6:.1f} MB)")

                    if cfgs:
                        cfg = cfgs[-1]

                        # --- RENDER (fixed) ---------------------------------------------
                        # Old command hung during mp4 video encoding after frames were
                        # already 100% rendered. --output-format images skips encoding
                        # entirely, and the timeout is raised so a slow but real render
                        # doesn't get killed mid-way.
                        status(SDIR, 'nerf_render', 75)
                        render_ok = run(
                            f'ns-render dataset --load-config {cfg} --split train '
                            f'--output-path {RES}/nerf_renders/ --output-format images',
                            timeout=4000
                        )
                        if not render_ok:
                            log("NeRF dataset render failed - checkpoint still saved, "
                                "just no preview frames were produced", "ERROR")

                        # --- EXPORT .ply (new) -------------------------------------------
                        # Nothing in the old pipeline ever called ns-export, so NeRF never
                        # produced a point cloud for the website even though training
                        # succeeded. This gives you a .ply comparable to Gaussian's output.
                        status(SDIR, 'nerf_export', 82)
                        export_ok = run(
                            f'ns-export pointcloud --load-config {cfg} '
                            f'--output-dir {RES}/nerf_export --num-points 1000000 '
                            f'--remove-outliers True --normal-method open3d --save-world-frame False',
                            timeout=3500
                        )
                        if export_ok:
                            nerf_ply_src = f'{RES}/nerf_export/point_cloud.ply'
                            if os.path.exists(nerf_ply_src):
                                nerf_ply_dst = f'{RES}/{statue}_nerf.ply'
                                shutil.copy(nerf_ply_src, nerf_ply_dst)
                                log(f"NeRF point cloud saved: "
                                    f"{os.path.getsize(nerf_ply_dst)/1e6:.1f} MB -> {nerf_ply_dst}")
                            else:
                                log(f"ns-export reported success but no point_cloud.ply "
                                    f"found at {nerf_ply_src}", "ERROR")
                        else:
                            log("NeRF pointcloud export failed - no .ply will be available "
                                "for the website", "ERROR")

                        # --- EVAL metrics (new) -------------------------------------------
                        # PSNR / SSIM / LPIPS, computed by nerfstudio against the eval-split
                        # images that were automatically held out during training.
                        status(SDIR, 'nerf_eval', 85)
                        eval_ok = run(
                            f'ns-eval --load-config {cfg} --output-path {RES}/nerf_metrics.json',
                            timeout=1500
                        )
                        if eval_ok and os.path.exists(f'{RES}/nerf_metrics.json'):
                            with open(f'{RES}/nerf_metrics.json') as f:
                                m = json.load(f)
                            log(f"NeRF metrics: {json.dumps(m.get('results', m), indent=2)}")
                        else:
                            log("NeRF eval (PSNR/SSIM/LPIPS) failed to produce metrics", "ERROR")

        # Gaussian
        if method in ['gaussian', 'both']:
            status(SDIR, 'gaussian_setup', 78)
            if not ensure_gaussian_splatting():
                log("Gaussian Splatting environment could not be prepared - skipping Gaussian stage", "ERROR")
            else:
                status(SDIR, 'gaussian_training', 80)
                # IMPORTANT: -s must be the COLMAP root (parent of sparse/0), NOT sparse/0
                # itself. Gaussian Splatting's Scene loader checks for a "sparse" subfolder
                # under -s; pointing -s at sparse/0 directly causes
                # "AssertionError: Could not recognize scene type!"
                # --eval holds out a test split so metrics.py has something to score against.
                gs_ok = run(
                    f'python train.py -s {COLMAP} --images {IMGS} -m {GOUT} '
                    f'--iterations {GS_ITERS} --save_iterations {GS_ITERS} '
                    f'--test_iterations {GS_ITERS} --eval',
                    cwd='/content/gaussian-splatting',
                    timeout=1500 if quick else 7500,
                    watch_dir=GOUT, watch_pattern='**/point_cloud.ply'
                )
                if not gs_ok:
                    log("Gaussian Splatting training FAILED", "ERROR")
                else:
                    status(SDIR, 'gaussian_render', 90)
                    render_ok_gs = run(f'python render.py -m {GOUT} --iteration {GS_ITERS}',
                        cwd='/content/gaussian-splatting', timeout=5500)

                    ply = f'{GOUT}/point_cloud/iteration_{GS_ITERS}/point_cloud.ply'
                    if os.path.exists(ply):
                        shutil.copy(ply, f'{RES}/{statue}.ply')
                        log(f"Point cloud saved: {os.path.getsize(ply)/1e6:.1f} MB -> {RES}/{statue}.ply")
                    else:
                        log(f"Expected point cloud not found at {ply}", "ERROR")

                    # --- EVAL metrics (new) ---------------------------------------------
                    # metrics.py ships with the gaussian-splatting repo; it reads the
                    # train/test renders produced above and writes results.json with
                    # PSNR, SSIM and LPIPS. Requires --eval at train time (added above)
                    # and the 'lpips' package (installed in ensure_gaussian_splatting).
                    if render_ok_gs:
                        status(SDIR, 'gaussian_eval', 95)
                        metrics_ok = run(f'python metrics.py -m {GOUT}',
                            cwd='/content/gaussian-splatting', timeout=1500)
                        results_json = f'{GOUT}/results.json'
                        if metrics_ok and os.path.exists(results_json):
                            shutil.copy(results_json, f'{RES}/gaussian_metrics.json')
                            with open(results_json) as f:
                                gm = json.load(f)
                            log(f"Gaussian metrics: {json.dumps(gm, indent=2)}")
                        else:
                            log("Gaussian metrics.py failed to produce results.json "
                                "(needs 'lpips' pip package + --eval at train time)", "ERROR")

        # DONE - determine REAL success, don't just declare victory
        nerf_renders_ok = os.path.exists(f'{RES}/nerf_renders/') and len(os.listdir(f'{RES}/nerf_renders/')) > 0
        nerf_ply_ok = os.path.exists(f'{RES}/{statue}_nerf.ply')
        nerf_metrics_ok = os.path.exists(f'{RES}/nerf_metrics.json')
        gaussian_ply_ok = os.path.exists(f'{RES}/{statue}.ply')
        gaussian_metrics_ok = os.path.exists(f'{RES}/gaussian_metrics.json')

        nerf_ok_final = nerf_renders_ok or nerf_ply_ok
        gaussian_ok_final = gaussian_ply_ok

        overall_status = 'success' if (nerf_ok_final or gaussian_ok_final) else 'partial_failure'
        status(SDIR, 'done', 100)

        manifest = {
            'session_id': sid,
            'statue': statue,
            'method': method,
            'image_count': len(images),
            'status': overall_status,
            'nerf_success': nerf_ok_final,
            'gaussian_success': gaussian_ok_final,
            'nerf_renders': f'{RES}/nerf_renders/' if nerf_renders_ok else None,
            'nerf_ply': f'{RES}/{statue}_nerf.ply' if nerf_ply_ok else None,
            'nerf_metrics': f'{RES}/nerf_metrics.json' if nerf_metrics_ok else None,
            'gaussian_ply': f'{RES}/{statue}.ply' if gaussian_ply_ok else None,
            'gaussian_metrics': f'{RES}/gaussian_metrics.json' if gaussian_metrics_ok else None,
        }
        with open(f'{RES}/manifest.json', 'w') as f:
            json.dump(manifest, f, indent=2)

        log(f"RUN COMPLETE: {overall_status}")
        log(json.dumps(manifest, indent=2))
        if overall_status != 'success':
            log("Neither method produced usable output. Check ERROR lines above / in pipeline.log.", "ERROR")
            sys.exit(1)

    except Exception as e:
        log(f"FATAL: {e}", "ERROR")
        status(SDIR, 'error', -1)
        os.makedirs(RES, exist_ok=True)
        with open(f'{RES}/manifest.json', 'w') as f:
            json.dump({'status': 'error', 'error': str(e)}, f)
        sys.exit(1)

if __name__ == '__main__':
    main()