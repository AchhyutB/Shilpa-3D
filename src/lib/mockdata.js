// mockData.js
//
// Stand-in for real backend responses. Every shape here (field names,
// nesting) is what api.js expects the REAL backend to eventually return.
// When the backend is ready, you don't touch this file's shape choices —
// you just flip USE_MOCK to false in api.js and make sure the real
// endpoints return the same shape.
//
// Swap the URLs below once you've copied the actual files out of the
// shared Drive folder into /public/assets (see README.md).

export const MOCK_JOB_ID = 'demo-job-1';

// Backs the History page. Date matches the real Completion_Date from
// your evaluation JSON.
export const MOCK_HISTORY = [
  {
    id: MOCK_JOB_ID,
    date: '2026-07-31',
    methods: ['nerf', 'gaussian'],
    status: 'complete',
  },
];

// Real numbers pulled from evaluation/multi_statue_results (Statue-1),
// which is the file marked "Project_Status": "COMPLETE".
//
// UNRESOLVED: a separate training_times.json gives conflicting numbers
// (NeRF: 90 min / 30000 iters, Gaussian: 35 min / 15000 iters) that line
// up with the iteration count in a training log that actually crashed
// (FileNotFoundError on a malformed image filename). Confirm with
// whoever owns the Colab notebook which run is the "real" final one
// before this ships — right now this file trusts multi_statue_results.
//
// SSIM / LPIPS were not present in either source file for Statue-1, so
// they're left null rather than invented. ResultsPage already falls
// back to "--" for null/undefined via `?? '--'`.
export const MOCK_RESULTS = {
  nerf: {
    name: 'NeRF Output',
    psnr: 10.91,
    ssim: null, // not present in evaluation JSON — check evaluation/Statue-1/nerf_scores.json
    processingTime: '120 MIN',
    // NeRF preview is a pre-rendered orbit video, not an interactive model.
    previewType: 'video',
    previewUrl: '/assets/videos/nerf_360.mp4',
  },
  gaussian: {
    name: 'Gaussian Splatting Output',
    psnr: 20.8,
    ssim: null, // not present in evaluation JSON — check evaluation/Statue-1/gaussian_scores.json
    processingTime: '17 MIN',
    // Gaussian preview can be the real interactive splat, or fall back to video.
    previewType: 'video',
    previewUrl: '/assets/videos/gaussian_360.mp4',
  },
};

export const MOCK_MODELS = {
  nerf: {
    type: 'video',
    url: '/assets/videos/nerf_360.mp4',
  },
  gaussian: {
    // Real deliverable is a raw 3D Gaussian Splatting .ply (from the
    // original inria/graphdeco splat trainer), NOT drei's <Splat>-ready
    // .splat/.ksplat format. See note in ThreeDViewerPage README section
    // below — this almost certainly needs a conversion step before it
    // can be dropped in here as-is.
    type: 'splat',
    url: '/assets/models/gaussian.splat',
  },
};

// --- Fake progressive job status -------------------------------------
// Keeps per-jobId progress in memory so repeated polls from the
// Processing page actually advance, instead of just returning random
// numbers every call.

const progressByJob = {};

const STAGE_DEFS = [
  { name: 'Loading images...', detail: 'COLMAP feature extraction', until: 35 },
  { name: 'Estimating camera poses', detail: 'COLMAP sparse reconstruction', until: 70 },
  { name: 'Training NeRF / Gaussian Splatting', detail: 'iter running | loss decreasing', until: 100 },
];

export function mockStatusForJob(jobId) {
  const prev = progressByJob[jobId] ?? 0;
  const next = Math.min(prev + 8 + Math.random() * 12, 100);
  progressByJob[jobId] = next;

  const stageIndex = STAGE_DEFS.findIndex((s) => next <= s.until);
  const currentStage = stageIndex === -1 ? STAGE_DEFS.length - 1 : stageIndex;

  const stages = STAGE_DEFS.map((s, i) => ({
    name: s.name,
    detail:
      i === 2 && next > STAGE_DEFS[1].until
        ? `iter ${Math.round(next * 553)} | loss: ${(1 / (next + 1)).toFixed(4)}`
        : s.detail,
  }));

  return {
    status: next >= 100 ? 'complete' : 'processing',
    progress: next,
    currentStage,
    stages,
  };
}

export function resetMockJob(jobId) {
  delete progressByJob[jobId];
}