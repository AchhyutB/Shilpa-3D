// MOCK MODE — no backend calls. Simulates the real pipeline's confirmed
// response shapes (status.json / manifest.json) so the UI can be tested
// end-to-end without Colab running.
//
// To go live again: restore the real api.js that calls your Node backend.

const MIN_DURATION_MS = 12000; // how long the fake job "runs" before finishing

const STAGE_SEQUENCE = [
  { stage: 'validating', pct: 5 },
  { stage: 'colmap_features', pct: 10 },
  { stage: 'colmap_matching', pct: 25 },
  { stage: 'colmap_mapper', pct: 40 },
  { stage: 'nerf_convert', pct: 50 },
  { stage: 'nerf_training', pct: 60 },
  { stage: 'nerf_render', pct: 75 },
  { stage: 'gaussian_setup', pct: 78 },
  { stage: 'gaussian_training', pct: 85 },
  { stage: 'gaussian_render', pct: 92 },
  { stage: 'done', pct: 100 },
];

// In-memory job store, keyed by fake session id
const jobs = {};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeSessionId() {
  return 'mock-' + Math.random().toString(36).slice(2, 10);
}

/**
 * Set to true to test the "processing failed" error path instead of success.
 */
const SIMULATE_FAILURE = false;

export async function createJob(images, methods, statueName) {
  await delay(400);

  const session_id = makeSessionId();
  const method = methods.includes('nerf') && methods.includes('gaussian')
    ? 'both'
    : methods.includes('gaussian') ? 'gaussian' : 'nerf';

  jobs[session_id] = {
    statue: statueName,
    method,
    image_count: images.length,
    startedAt: Date.now(),
    failAt: SIMULATE_FAILURE ? Date.now() + MIN_DURATION_MS / 2 : null,
  };

  return { jobId: session_id };
}

export async function getJobStatus(jobId) {
  await delay(150);

  const job = jobs[jobId];
  if (!job) throw new Error('Job not found');

  const elapsed = Date.now() - job.startedAt;

  if (job.failAt && Date.now() >= job.failAt) {
    return { status: 'failed', progress: 45, stage: 'error' };
  }

  const fraction = Math.min(elapsed / MIN_DURATION_MS, 1);
  const idx = Math.min(
    Math.floor(fraction * STAGE_SEQUENCE.length),
    STAGE_SEQUENCE.length - 1
  );
  const current = STAGE_SEQUENCE[idx];

  return {
    status: current.stage === 'done' ? 'complete' : 'processing',
    progress: current.pct,
    stage: current.stage,
  };
}

export async function getJobResults(jobId) {
  await delay(300);

  const job = jobs[jobId];
  if (!job) throw new Error('Job not found');

  const elapsed = Date.now() - job.startedAt;
  if (elapsed < MIN_DURATION_MS) {
    // Mirrors the real backend's 404 "not ready yet" behavior
    throw new Error('Results not available yet');
  }

  const nerf_success = job.method === 'nerf' || job.method === 'both';
  const gaussian_success = job.method === 'gaussian' || job.method === 'both';

  return {
    session_id: jobId,
    statue: job.statue,
    method: job.method,
    image_count: job.image_count,
    status: 'success',
    nerf_success,
    gaussian_success,
    nerf_renders: nerf_success ? `/mock/${jobId}/results/nerf_renders/` : null,
    gaussian_ply: gaussian_success ? `/mock/${jobId}/results/${job.statue}.ply` : null,
  };
}

export async function getJobModels(jobId) {
  const manifest = await getJobResults(jobId);

  const gaussian = manifest.gaussian_success
    ? {
        type: 'ply',
        // Point this at a real sample .ply file you drop in /public/assets/
        // to actually test the viewer rendering, e.g.:
        url: '/assets/models/sample.ply',
      }
    : null;

  const nerf = manifest.nerf_success
    ? { type: 'unavailable', url: null }
    : null;

  return { nerf, gaussian };
}

export async function getJobHistory() {
  await delay(200);
  return Object.entries(jobs).map(([id, job]) => ({
    id,
    date: new Date(job.startedAt).toISOString(),
    methods: job.method === 'both' ? ['nerf', 'gaussian'] : [job.method],
    status: 'complete',
  }));
}

export async function deleteJob(jobId) {
  await delay(150);
  delete jobs[jobId];
  return { deleted: true };
}