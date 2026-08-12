/**
 * create-history-entry.js
 *
 * Creates a brand-new, fully-formed session folder under server/uploads/
 * so it shows up as its own card in History — with a real statue name
 * instead of "Untitled statue".
 *
 * Usage (run from the project root):
 *   node create-history-entry.js <username> <statue-name> <method> <path-to-ply>
 *
 * <method> must be "gaussian" or "nerf"
 *
 * Examples (run once per file, for two separate History entries):
 *   node create-history-entry.js achhyut.baral03 "Test Statue" gaussian teststatue.ply
 *   node create-history-entry.js achhyut.baral03 "Test Statue NeRF" nerf teststatue_nerf.ply
 *
 * What it does:
 *   1. Generates a new session id
 *   2. Writes owner.json (so getHistory's ownership check passes for <username>)
 *   3. Writes status.json (stage: "done", percent: 100)
 *   4. Copies your .ply into results/<slug>.ply (or _nerf.ply for nerf method)
 *   5. Writes results/manifest.json with the statue name + correct file reference
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const [, , username, statueName, method, srcPath] = process.argv;

if (!username || !statueName || !method || !srcPath) {
  console.error("Usage: node create-history-entry.js <username> <statue-name> <method: gaussian|nerf> <path-to-ply>");
  process.exit(1);
}

if (!["gaussian", "nerf"].includes(method)) {
  console.error(`Invalid method "${method}" — must be "gaussian" or "nerf"`);
  process.exit(1);
}

if (!fs.existsSync(srcPath)) {
  console.error(`Source file not found: ${srcPath}`);
  process.exit(1);
}

const sessionId = crypto.randomUUID();
const sessionDir = path.join("server", "uploads", sessionId);
const resultsDir = path.join(sessionDir, "results");

fs.mkdirSync(resultsDir, { recursive: true });

// owner.json — must match req.user.username exactly for getHistory to show it
fs.writeFileSync(
  path.join(sessionDir, "owner.json"),
  JSON.stringify({ owner: username, createdAt: new Date().toISOString() }, null, 2)
);

// status.json
fs.writeFileSync(
  path.join(sessionDir, "status.json"),
  JSON.stringify({ stage: "done", percent: 100, updated: new Date().toISOString() }, null, 2)
);

// slugify the statue name for the filename
const slug = statueName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "statue";
const destFilename = method === "nerf" ? `${slug}_nerf.ply` : `${slug}.ply`;
const destPath = path.join(resultsDir, destFilename);
fs.copyFileSync(srcPath, destPath);

// manifest.json — statue field is what History displays instead of "Untitled statue"
const manifest = {
  session_id: sessionId,
  statue: statueName,
  method,
  status: "success",
  nerf_success: method === "nerf",
  gaussian_success: method === "gaussian",
  nerf_ply: method === "nerf" ? `results/${destFilename}` : null,
  gaussian_ply: method === "gaussian" ? `results/${destFilename}` : null,
};
fs.writeFileSync(path.join(resultsDir, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log(`\nCreated new session: ${sessionId}`);
console.log(`  Statue name: ${statueName}`);
console.log(`  Method: ${method}`);
console.log(`  File cached at: ${destPath}`);
console.log(`\nReload the History page — this should now show up as its own entry.`);