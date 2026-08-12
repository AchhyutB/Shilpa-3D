import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.join("server", "uploads");
const PIPELINE_TIMEOUT_MS = 8000;

// Prevents a filename like "../../etc/passwd" (or an absolute path) from
// escaping the session's results folder when we write/read the local cache.
function safeJoin(baseDir, untrustedPath) {
  const target = path.join(baseDir, untrustedPath);
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(target);
  if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
    return null;
  }
  return resolvedTarget;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = PIPELINE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export const getResults = async (req, res) => {
  const { session_id } = req.params;
  const resultsDir = path.join(UPLOADS_DIR, session_id, "results");
  const manifestPath = path.join(resultsDir, "manifest.json");

  // Check the local cache FIRST. A session created locally (e.g. via a
  // cache/import script) or one already fetched before has no reason to
  // wait on a live pipeline/ngrok round trip -- and if the pipeline is
  // dead, hitting it first means every load hangs on "Loading results...".
  if (fs.existsSync(manifestPath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      return res.status(200).json(cached);
    } catch (err) {
      console.error(`[results] Local manifest for ${session_id} is corrupt:`, err.message);
      // fall through and try the pipeline instead
    }
  }

  try {
    const response = await fetchWithTimeout(
      `${process.env.PIPELINE_URL}/jobs/${session_id}/results`,
      { headers: { "ngrok-skip-browser-warning": "true" } }
    );

    if (response.status === 404) {
      return res.status(404).json({ message: "Results not available yet" });
    }
    if (!response.ok) {
      return res.status(502).json({ message: "Pipeline server error" });
    }

    const data = await response.json();

    // Cache locally so next load doesn't need the pipeline at all.
    try {
      fs.mkdirSync(resultsDir, { recursive: true });
      fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2));
    } catch (cacheErr) {
      console.error(`[results] Failed to cache manifest for session ${session_id}:`, cacheErr.message);
    }

    return res.status(200).json(data);
  } catch (err) {
    const reason = err.name === "AbortError" ? "Pipeline server timed out" : "Results not available yet";
    return res.status(404).json({ message: reason });
  }
};

export const getFile = async (req, res) => {
  const { session_id } = req.params;
  const filename = Array.isArray(req.params.filename)
    ? req.params.filename.join("/")
    : req.params.filename;

  if (!filename) {
    return res.status(400).json({ message: "filename is required" });
  }

  const resultsDir = path.join(UPLOADS_DIR, session_id, "results");
  const localPath = safeJoin(resultsDir, filename);

  if (!localPath) {
    return res.status(400).json({ message: "Invalid filename" });
  }

  // Serve the locally cached copy if we already have one.
  if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
    return res.sendFile(path.resolve(localPath), (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ message: "Failed to read cached file" });
      }
    });
  }

  try {
    // Requires a matching route on the pipeline (Colab/ngrok) side, e.g.
    // `GET /jobs/:session_id/files/:filename`, that streams the raw file
    // from the session's results directory.
    const response = await fetchWithTimeout(
      `${process.env.PIPELINE_URL}/jobs/${session_id}/files/${encodeURIComponent(filename)}`,
      { headers: { "ngrok-skip-browser-warning": "true" } }
    );

    if (response.status === 404) {
      return res.status(404).json({ message: "File not found" });
    }
    if (!response.ok) {
      return res.status(502).json({ message: "Pipeline server error" });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    try {
      fs.mkdirSync(resultsDir, { recursive: true });
      fs.writeFileSync(localPath, buffer);
    } catch (cacheErr) {
      console.error(`[files] Failed to cache ${filename} for session ${session_id}:`, cacheErr.message);
    }

    res.set("Content-Type", contentType);
    return res.send(buffer);
  } catch (err) {
    const message = err.name === "AbortError" ? "Pipeline server timed out" : "Failed to fetch file from pipeline";
    return res.status(502).json({ message });
  }
};