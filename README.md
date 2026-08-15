# Shilpa3D

**A 3D Reconstruction System for Nepali Statues using Neural Radiance Fields (NeRF) and 3D Gaussian Splatting**

Shilpa3D is a capstone project that reconstructs photorealistic, explorable 3D digital twins of Nepali cultural heritage statues from ordinary phone photographs. It combines classical Structure-from-Motion (SfM) with two modern neural/point-based radiance field methods — NeRF and 3D Gaussian Splatting — into a single, automated, GPU-accelerated pipeline, and serves the resulting 3D assets through a web-based viewer.

---

## Table of Contents

1. [Motivation](#motivation)
2. [System Architecture](#system-architecture)
3. [Team & Responsibilities](#team--responsibilities)
4. [Tech Stack](#tech-stack)
5. [Pipeline Walkthrough](#pipeline-walkthrough)
6. [Repository Structure](#repository-structure)
7. [Setup & Installation](#setup--installation)
8. [Usage](#usage)
9. [Configuration Reference](#configuration-reference)
10. [Evaluation & Results](#evaluation--results)
11. [Known Issues & Fixes (Engineering Log)](#known-issues--fixes-engineering-log)
12. [Design Decisions & Rationale](#design-decisions--rationale)
13. [Limitations](#limitations)
14. [Future Work](#future-work)
15. [References](#references)
16. [License](#license)

---

## Motivation

Nepal's tangible cultural heritage — stone and metal statuary found in temples, courtyards, and public squares — faces ongoing risk from weathering, urban development, theft, and natural disasters (notably the 2015 earthquake, which damaged or destroyed numerous heritage structures). Physical restoration and archival photography alone do not preserve the *spatial* and *volumetric* character of these artifacts.

Shilpa3D addresses this by building an accessible, low-cost pipeline that goes from **a smartphone photo set of a statue** to **a fully explorable 3D model**, viewable in a browser, without requiring specialized 3D scanning hardware (LiDAR rigs, structured-light scanners, etc.), which are expensive and impractical for widespread cultural preservation efforts in Nepal.

---

## System Architecture

Shilpa3D is a three-tier system:

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Frontend       │────▶│   Backend             │────▶│  AI/Reconstruction│
│   (React.js +    │     │   (Node.js +          │     │  Pipeline         │
│   Three.js)      │◀────│   Express.js)         │◀────│  (Python, Colab)  │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
   Member 3                   Member 2                    Member 1
   3D web viewer,              REST API,                  COLMAP → NeRF /
   upload UI,                  session mgmt,               Gaussian Splatting,
   result gallery               file storage                normalization,
                                                              evaluation
```

- **Member 1 (AI/Reconstruction Pipeline)** — owns everything in this repository's `pipeline/` directory: image preprocessing, COLMAP orchestration, NeRF and Gaussian Splatting training, evaluation, and packaging of output assets for the web viewer.
- **Member 2 (Backend)** — Node.js/Express.js API that accepts image uploads, manages reconstruction sessions, triggers the pipeline (via Colab or a compute backend), and serves results to the frontend.
- **Member 3 (Frontend)** — React.js application using Three.js to render the reconstructed `.ply` point clouds / Gaussian splats in an interactive 3D viewer, plus the upload and gallery UI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Structure-from-Motion | [COLMAP](https://colmap.github.io/) |
| Neural Radiance Fields | [nerfstudio](https://docs.nerf.studio/) (`nerfacto` method) |
| 3D Gaussian Splatting | [graphdeco-inria/gaussian-splatting](https://github.com/graphdeco-inria/gaussian-splatting) |
| Compute | Google Colab (T4 GPU), CUDA 12.4, PyTorch 2.5.1 |
| Image preprocessing | OpenCV, Pillow (`ImageOps.exif_transpose`) |
| Evaluation | scikit-image (PSNR, SSIM), `lpips` (LPIPS via AlexNet features), nerfstudio's `ns-eval` |
| Backend | Node.js, Express.js |
| Frontend | React.js, Three.js |
| Storage | Google Drive (model/dataset artifacts — `.gitignore`'d from version control) |
| Presentation tooling | `pptxgenjs` (programmatic slide generation) |

---

## Pipeline Walkthrough

The reconstruction pipeline (`pipeline/pipeline.py`) runs as a single orchestrated script with live-streamed logging, pre-flight environment validation, and honest failure reporting (it never silently reports success when a stage actually failed). It proceeds through the following stages:

### Stage 0 — Pre-flight checks
Before touching any data, the pipeline verifies:
- `colmap` binary is on `PATH`
- `ns-train` (nerfstudio CLI) is on `PATH`
- PyTorch reports CUDA availability
- Fails fast and loudly if anything is missing, rather than discovering it 40 minutes into a run.

### Stage 1 — Image Validation & Normalization
- Confirms at least 10 images are present in the session's `images/` directory.
- **EXIF orientation normalization**: phone cameras embed an EXIF orientation tag rather than physically rotating pixel data. COLMAP and nerfstudio's dataloaders can disagree on how to interpret this tag, causing a width/height mismatch that manifests as an `IndexError` deadlock deep into NeRF training. `normalize_images.py` uses `PIL.ImageOps.exif_transpose()` to bake the correct rotation into the pixel data and strips the EXIF tag, guaranteeing every downstream tool sees identical, unambiguous image dimensions.

### Stage 2 — COLMAP Sparse Reconstruction (Structure-from-Motion)
1. **Feature extraction** (`colmap feature_extractor`) — SIFT keypoint detection per image. Run with `QT_QPA_PLATFORM=offscreen` (see [Known Issues](#known-issues--fixes-engineering-log)) and `--ImageReader.camera_model SIMPLE_PINHOLE` for a single, shared camera model across the capture set.
2. **Feature matching** (`colmap exhaustive_matcher` for ≤100 images, `sequential_matcher` above that) — finds correspondences between image pairs.
3. **Incremental mapping** (`colmap mapper`) — incremental Structure-from-Motion: picks a good initial image pair, triangulates points, then iteratively registers new images and re-runs bundle adjustment (nonlinear least-squares optimization of all camera poses + 3D point positions jointly) after each registration.
4. Output: a sparse point cloud plus estimated camera intrinsics/extrinsics for every registered image, in `sparse/0/` (binary COLMAP format).

### Stage 3 — COLMAP → NeRF Format Conversion
- Converts COLMAP's binary output to text format (`colmap model_converter`).
- Custom converter (`convert_colmap_to_nerf`) parses `images.txt` and `cameras.txt` and emits `transforms.json` in nerfstudio's expected schema — camera intrinsics (`fl_x`, `fl_y`, `cx`, `cy`, `w`, `h`) plus a `camera_to_world` transform matrix per frame, converting COLMAP's quaternion+translation convention into the matrix form nerfstudio expects.
- **Critical parsing detail**: COLMAP's `images.txt` format writes two lines per image — a pose line and a corresponding 2D-point observation line. Naively filtering on line length double-counts frames; the converter steps through the file in strict pairs.

### Stage 4 — NeRF Training (nerfacto)
- `ns-train nerfacto` trains an implicit MLP-based radiance field.
- Key flags tuned during development:
  - `--vis tensorboard` (not `viewer+wandb`, which requires external service credentials and will hard-fail without them)
  - `--pipeline.model.eval-num-rays-per-chunk 4096` and `--steps-per-eval-image 1000` — prevents CUDA OOM during periodic full-resolution evaluation renders (see [Known Issues](#known-issues--fixes-engineering-log))
  - `nerfstudio-data --downscale-factor 2` — halves working resolution for full-res phone photos to fit T4 GPU memory
- Checkpoints are watched and logged live as they're written to `nerfstudio_models/`.

### Stage 5 — NeRF Export & Rendering
- `ns-render dataset` — renders held-out/train-split preview frames for visual QA (best-effort; failure here doesn't invalidate the trained model).
- `ns-export pointcloud` — extracts a `.ply` point cloud from the trained implicit field so NeRF output has an explorable asset parity with Gaussian Splatting's native point-based output.

### Stage 6 — Gaussian Splatting Training
1. **Auto-provisioning**: the pipeline clones `graphdeco-inria/gaussian-splatting --recursive` and builds its CUDA submodules (`diff-gaussian-rasterization`, `simple-knn`) on first run if not already present, verifying the build by attempting to import both compiled extensions.
2. **Training** (`train.py`): initializes 3D Gaussians directly from COLMAP's sparse point cloud (an explicit, geometrically-informed starting point — see [Design Decisions](#design-decisions--rationale) for why this converges faster than NeRF), then optimizes position, covariance (shape/orientation), color (spherical harmonics), and opacity per Gaussian via differentiable rasterization.
   - **Critical path detail**: `-s` (source path) must point at the COLMAP *parent* directory (the one containing both `images/` and `sparse/0/`), not `sparse/0` itself — pointing too deep throws `AssertionError: Could not recognize scene type!`.
3. **Rendering** (`render.py`) and **point cloud export** — the trained model's `point_cloud.ply` is copied to the session's results directory as the final web-viewer asset.

### Stage 7 — Evaluation
- **NeRF**: `ns-eval` computes PSNR, SSIM, and LPIPS on held-out evaluation views, writing a metrics JSON.
- **Gaussian Splatting**: trained with `--eval` to hold out a test split, then evaluated using the repo's `metrics.py` (PSNR via scikit-image, SSIM, LPIPS via AlexNet backbone) for a directly comparable metric set against NeRF.

### Stage 8 — Manifest & Handoff
- Writes a `manifest.json` per session summarizing: image count, method(s) run, real (not assumed) success/failure per method, paths to renders, exported point clouds, and metrics — consumed by the backend to know what's actually available to show the frontend.

---

## Repository Structure

```
shilpa3D/
├── pipeline/
│   ├── pipeline.py              # Main orchestrator (this is the file to run)
│   ├── normalize_images.py      # EXIF orientation preprocessing
│   └── requirements.txt
├── backend/                     # Node.js / Express.js API (Member 2)
├── frontend/                    # React.js / Three.js viewer (Member 3)
├── sessions/                    # Per-run working directories (gitignored)
│   └── <session_id>/
│       ├── images/              # Input photos
│       ├── colmap/               # COLMAP database + sparse reconstruction
│       ├── nerf_data/            # transforms.json + copied images for nerfstudio
│       ├── nerf_out/             # nerfstudio training outputs, checkpoints
│       ├── gaussian_out/         # Gaussian Splatting training outputs
│       ├── results/              # Final assets: .ply files, renders, metrics, manifest.json
│       ├── pipeline.log          # Full streamed log for this session
│       └── status.json           # Machine-readable current stage/progress
├── docs/                        # Documentation, wireframes, defense slides
└── README.md
```

`.gitignore` excludes `sessions/`, `*.ply`, `*.ckpt`, and other large binary artifacts — these live on Google Drive, not in version control.

---

## Setup & Installation

### Prerequisites
- Python 3.12
- CUDA-capable GPU (developed/tested on Google Colab T4; 15 GB+ VRAM recommended for full-resolution phone photos)
- `colmap` installed and on `PATH` (`apt-get install -y colmap` on Debian/Ubuntu)
- `torch` 2.5.1+cu124 (or matching CUDA build for your GPU)

### Environment Setup (Google Colab)

```python
# Install COLMAP
!apt-get install -y colmap

# Install nerfstudio
!pip install nerfstudio --break-system-packages -q

# Gaussian Splatting is auto-cloned and built by pipeline.py on first run —
# no manual setup needed.
```

### Environment Setup (Local / Other Cloud)

```bash
git clone <this-repo-url>
cd shilpa3D/pipeline
pip install -r requirements.txt --break-system-packages
sudo apt-get install -y colmap
```

`requirements.txt` should include at minimum: `nerfstudio`, `torch`, `numpy`, `Pillow`, `opencv-python`, `scikit-image`, `lpips`.

---

## Usage

### 1. Prepare a capture session

Place 10+ well-overlapping (60–80% overlap recommended) photos of the statue into:
```
sessions/<session_id>/images/
```

### 2. Normalize images (recommended, prevents EXIF-related NeRF crashes)

```bash
python pipeline/normalize_images.py sessions/<session_id>/images
```

### 3. Smoke-test the pipeline (fast, low-iteration sanity check)

```bash
python pipeline/pipeline.py <session_id> <statue_name> both quick
```

Always run in `quick` mode first after any pipeline change — it runs the full COLMAP → NeRF → Gaussian → export → eval chain at ~300 iterations instead of tens of thousands, surfacing integration bugs in minutes instead of hours.

### 4. Full run

```bash
python pipeline/pipeline.py <session_id> <statue_name> both
```

`method` can be `nerf`, `gaussian`, or `both`.

### 5. Check results

```python
import json
manifest = json.load(open(f'sessions/<session_id>/results/manifest.json'))
print(json.dumps(manifest, indent=2))
```

`status` will honestly report `success` or `partial_failure` — the pipeline verifies output files actually exist before claiming success, rather than assuming a non-crashing run means valid output.

---

## Configuration Reference

| Flag / Setting | Purpose |
|---|---|
| `SHILPA_SESSIONS_DIR` (env var) | Overrides default session root (`/content/drive/MyDrive/shilpa3D/sessions` on Colab) |
| `quick` (positional arg) | Runs at reduced iteration counts (300 NeRF / 300 Gaussian) for fast integration testing |
| `--pipeline.model.eval-num-rays-per-chunk 4096` | Caps per-chunk ray count during NeRF eval renders to avoid CUDA OOM on full-res eval images |
| `--steps-per-eval-image 1000` | Reduces frequency of expensive full-image eval renders during NeRF training |
| `nerfstudio-data --downscale-factor 2` | Halves training/eval image resolution to fit GPU memory budget |
| `QT_QPA_PLATFORM=offscreen` | Required for COLMAP CLI tools to run headless (no X11 display) — see below |
| Gaussian `-s` (source path) | **Must** be the COLMAP parent directory containing both `images/` and `sparse/0/`, not `sparse/0` itself |

---

## Evaluation & Results

Evaluated on **Statue-1** (15-image capture, T4 GPU):

| Method | PSNR (dB) ↑ | SSIM ↑ | LPIPS ↓ |
|---|---|---|---|
| **3D Gaussian Splatting** (15,000 iters) | **20.80** | **0.578** | **0.511** |
| NeRF (`nerfacto`, 30,000 iters) | 10.91 | 0.163 | 0.819 |

Gaussian Splatting decisively outperforms NeRF on every metric, despite using *fewer* training iterations. This is expected and explained by their architectural differences — see [Design Decisions](#design-decisions--rationale).

- **PSNR** (Peak Signal-to-Noise Ratio): pixel-wise fidelity vs. held-out ground-truth views.
- **SSIM** (Structural Similarity Index, Wang et al. 2004): perceptually-motivated structural comparison, more robust to blur than raw PSNR.
- **LPIPS** (Learned Perceptual Image Patch Similarity, Zhang et al. 2018): deep-feature-based (AlexNet) perceptual distance, correlates best with human judgment of realism.

All three are reported together because no single metric is sufficient in isolation — this is standard practice in the NeRF/3DGS literature (used in both the original NeRF and 3DGS papers).

---

## Known Issues & Fixes (Engineering Log)

This section documents real failures encountered during development and their root causes and fixes, kept here so future contributors don't re-debug the same issues.

### `AssertionError: Could not recognize scene type!` (Gaussian Splatting)
**Cause**: `-s` pointed at `colmap/sparse/0` instead of the COLMAP parent directory. Gaussian Splatting's scene loader checks for a `sparse/` subdirectory *under* `-s`; pointing directly at `sparse/0` puts it one level too deep.
**Fix**: `-s {colmap_root}` where `colmap_root` contains both `images/` and `sparse/0/`.

### `wandb.errors.errors.UsageError: No API key configured`
**Cause**: `--vis viewer+wandb` attempts to log metrics to Weights & Biases, which requires an account/API key.
**Fix**: use `--vis tensorboard` — logs locally to disk, no external account needed.

### `IndexError: index 3515 is out of bounds for dimension 1 with size 3024` (NeRF training deadlock)
**Cause**: EXIF orientation tag mismatch between what COLMAP/PIL assume and what nerfstudio's parallel dataloader loads, causing a worker process crash that silently deadlocks the main training loop (it hangs forever waiting for data from a dead worker, rather than raising a visible error) until an external timeout kills it.
**Fix**: `normalize_images.py` — bake EXIF rotation into pixel data and strip the tag *before* running COLMAP, so every tool downstream agrees on image dimensions.

### `torch.OutOfMemoryError: CUDA out of memory` during NeRF training
**Cause**: nerfstudio's periodic evaluation step renders a full-resolution image (3024×4032 for un-downscaled phone photos) to compute eval metrics, which is memory-hungry and stacks on top of training's own GPU usage.
**Fix**: `--pipeline.model.eval-num-rays-per-chunk 4096` (smaller eval ray chunks), `--steps-per-eval-image 1000` (less frequent full-image evals), and `nerfstudio-data --downscale-factor 2` (halve working resolution).

### `QT_QPA_PLATFORM` / Qt display errors from COLMAP
**Cause**: COLMAP bundles an optional Qt-based GUI. On a headless server (no `$DISPLAY`), Qt's default "xcb" platform plugin tries to connect to a nonexistent X server and crashes, even when only using the CLI reconstruction tools.
**Fix**: `export QT_QPA_PLATFORM=offscreen` before invoking any `colmap` command — forces headless rendering, CLI functionality is unaffected.

### Silent pipeline "success" with empty output
**Cause**: the original pipeline script used `subprocess.run(capture_output=True)` (buffers all output until process exit — looks identical to a hang from the outside) and declared `status: success` unconditionally at the end regardless of whether NeRF/Gaussian actually produced usable output.
**Fix**: switched to `Popen` with live line-by-line streaming (visible progress, immediate error surfacing), added a background checkpoint-watcher thread, and made final status conditional on verifying output files actually exist on disk.

### `ns-render` timeout at full resolution
**Cause**: 700s timeout was too short for rendering 14 full-resolution (downscale factor 1) preview frames plus video encoding.
**Fix**: increased timeout to 1800s and added `--downscale-factor 2` to the render command to match training resolution.

---

## Design Decisions & Rationale

**Why COLMAP for Structure-from-Motion?**
COLMAP (Schönberger & Frahm, *"Structure-from-Motion Revisited,"* CVPR 2016) is the de facto standard SfM tool, and both nerfstudio and Gaussian Splatting natively consume its output format (`cameras.txt`/`images.txt`/`points3D.txt`), avoiding custom format-conversion work for camera pose estimation.

**Why does Gaussian Splatting converge faster and score higher than NeRF?**
- NeRF (Mildenhall et al., ECCV 2020; `nerfacto` is nerfstudio's production-tuned hybrid of post-NeRF improvements) represents the scene *implicitly* as MLP weights. Every pixel requires ray marching through space with dozens of network queries per ray — an iterative function-approximation problem with no explicit geometric prior, hence tens of thousands of iterations to converge.
- 3D Gaussian Splatting (Kerbl et al., SIGGRAPH 2023) represents the scene *explicitly* as a set of 3D Gaussians initialized directly from COLMAP's sparse point cloud — a geometrically-informed starting point, not random. Rendering is fast differentiable rasterization, not ray marching, so gradients are cheap and convergence is faster per-iteration and in wall-clock time.

**Why self-collect the dataset instead of using public benchmarks (NeRF-Synthetic, Tanks and Temples, etc.)?**
No existing public dataset targets Nepali cultural heritage statuary — the project's entire value proposition is domain-specific preservation, and public generic-object datasets would not represent the outdoor lighting, weathered stone/metal surfaces, and specific geometry this system needs to actually handle.

**Why start directly with statues instead of simple validation objects?**
The functional requirement was statue reconstruction specifically, not general object reconstruction. Testing on simple objects would validate pipeline mechanics but not surface domain-specific failure modes (fine carved detail, specular/weathered reflectance, uncontrolled outdoor lighting, non-convex geometry) that only appear with the real target class — a deliberate tradeoff accepting more up-front debugging in exchange for earlier discovery of real-world failure modes.

**Why PSNR + SSIM + LPIPS together?**
Each captures a different notion of quality — PSNR (pixel fidelity) doesn't correlate well with perceived quality alone, SSIM adds structural comparison, LPIPS (Zhang et al., CVPR 2018) uses deep features to approximate human perceptual judgment. Reporting all three is standard practice in the NeRF/3DGS literature specifically because no single metric is sufficient in isolation.

---

## Limitations

- **Reconstruction is up to an unknown scale factor** — COLMAP has no absolute reference (no GPS/marker calibration used), so outputs are relatively but not metrically accurate. Acceptable for visualization-focused heritage preservation, not for applications requiring absolute measurements.
- **NeRF underperforms Gaussian Splatting** on this dataset and iteration budget — see [Evaluation](#evaluation--results). Gaussian Splatting is the recommended default method for this use case.
- **Compute cost is non-trivial**: full pipeline runs (COLMAP + NeRF + Gaussian + eval) take on the order of an hour or more on a T4 GPU for a 15-image capture; this scales with image count and is not currently optimized for large (100+) image sets.
- **Exhaustive feature matching is O(n²)** in image count; sets above ~100 images should use sequential or vocabulary-tree matching (not yet implemented as an automatic switch beyond the existing `>100` threshold).
- Metrics reported (PSNR/SSIM/LPIPS) are **novel-view synthesis** metrics — they measure how well the model renders held-out camera views, not direct geometric accuracy against ground-truth 3D geometry (no ground-truth mesh was available for comparison).

---

## Future Work

- Automated sequential/vocabulary-tree matching for large capture sets.
- Metric-scale calibration via known reference objects or fiducial markers in-scene.
- Integration of mesh extraction (Poisson reconstruction) for applications needing solid geometry, not just point-based/implicit representations.
- Batch processing of multiple statues with parallelized Colab/cloud compute.
- Progressive/streaming loading of large `.ply` assets in the Three.js frontend for faster time-to-first-render.

---

## References

1. Schönberger, J. L., & Frahm, J.-M. (2016). *Structure-from-Motion Revisited*. CVPR.
2. Mildenhall, B., et al. (2020). *NeRF: Representing Scenes as Neural Radiance Fields for View Synthesis*. ECCV.
3. Kerbl, B., Kopanas, G., Leimkühler, T., & Drettakis, G. (2023). *3D Gaussian Splatting for Real-Time Radiance Field Rendering*. SIGGRAPH.
4. Wang, Z., Bovik, A. C., Sheikh, H. R., & Simoncelli, E. P. (2004). *Image Quality Assessment: From Error Visibility to Structural Similarity*. IEEE Transactions on Image Processing (SSIM).
5. Zhang, R., Isola, P., Efros, A. A., Shechtman, E., & Wang, O. (2018). *The Unreasonable Effectiveness of Deep Features as a Perceptual Metric*. CVPR (LPIPS).
6. [nerfstudio documentation](https://docs.nerf.studio/)
7. [graphdeco-inria/gaussian-splatting](https://github.com/graphdeco-inria/gaussian-splatting)
8. [COLMAP documentation](https://colmap.github.io/)

---



---

