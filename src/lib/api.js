// api.js
//
// Every page should call THESE functions, never fetch() directly.
// Right now USE_MOCK = true, so everything is served from mockData.js
// using the files you copy into /public/assets (see README.md).
//
// When the real backend is ready:
//   1. Set USE_MOCK = false
//   2. Set VITE_API_BASE_URL in your .env
//   3. Confirm the real endpoints return the same field names used
//      in mockData.js (psnr, ssim, processingTime, previewType,
//      previewUrl, models.nerf.type, models.gaussian.url, etc.)
//      If your backend team names things differently, adjust the
//      real-fetch functions below to remap fields — don't change
//      every page that consumes them.

import {
  MOCK_JOB_ID,
  MOCK_RESULTS,
  MOCK_MODELS,
  MOCK_HISTORY,
  mockStatusForJob,
} from './mockdata';

const USE_MOCK = true;
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Kick off a new reconstruction job.
 * @param {File[]} images - 20-40 uploaded images
 * @param {string[]} methods - which methods to run, e.g. ['nerf', 'gaussian']
 * @returns {Promise<{ jobId: string }>}
 */
export async function createJob(images, methods = ['nerf', 'gaussian']) {
  if (USE_MOCK) {
    await delay(300);
    return { jobId: MOCK_JOB_ID };
  }

  const formData = new FormData();
  images.forEach((file) => formData.append('images', file));
  methods.forEach((m) => formData.append('methods', m));

  const res = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to create job');
  return res.json(); // expects { jobId }
}

/**
 * Poll job status. Call this every 2-3s from the Processing page.
 * @param {string} jobId
 * @returns {Promise<{ status: 'processing'|'complete'|'failed', progress: number, currentStage: number, stages: {name:string, detail:string}[] }>}
 */
export async function getJobStatus(jobId) {
  if (USE_MOCK) {
    await delay(150);
    return mockStatusForJob(jobId);
  }

  const res = await fetch(`${API_BASE}/jobs/${jobId}/status`);
  if (!res.ok) throw new Error('Failed to fetch job status');
  return res.json();
}

/**
 * Fetch final metrics + preview info for the Results page.
 * @param {string} jobId
 * @returns {Promise<{ nerf: object, gaussian: object }>}
 */
export async function getJobResults(jobId) {
  if (USE_MOCK) {
    await delay(300);
    return MOCK_RESULTS;
  }

  const res = await fetch(`${API_BASE}/jobs/${jobId}/results`);
  if (!res.ok) throw new Error('Failed to fetch job results');
  return res.json();
}

/**
 * Fetch actual model file URLs for the 3D Viewer page.
 * @param {string} jobId
 * @returns {Promise<{ nerf: {type:string, url:string}, gaussian: {type:string, url:string} }>}
 */
export async function getJobModels(jobId) {
  if (USE_MOCK) {
    await delay(300);
    return MOCK_MODELS;
  }

  const res = await fetch(`${API_BASE}/jobs/${jobId}/models`);
  if (!res.ok) throw new Error('Failed to fetch job models');
  return res.json();
}

/**
 * Fetch the list of past jobs for the History page.
 * @returns {Promise<{ id: string, date: string, methods: string[], status: string }[]>}
 */
export async function getJobHistory() {
  if (USE_MOCK) {
    await delay(300);
    return MOCK_HISTORY;
  }

  const res = await fetch(`${API_BASE}/jobs`);
  if (!res.ok) throw new Error('Failed to fetch job history');
  return res.json();
}

/**
 * Delete a job from history.
 * @param {string} jobId
 */
export async function deleteJob(jobId) {
  if (USE_MOCK) {
    await delay(200);
    return { deleted: true };
  }

  const res = await fetch(`${API_BASE}/jobs/${jobId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete job');
  return res.json();
}