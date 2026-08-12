import fs from "fs";
import path from "path";

// Strips a leading UTF-8 BOM if present (e.g. from PowerShell's
// `Out-File -Encoding utf8`, which writes one by default) before parsing.
function readJsonSafe(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

export const getHistory = (req, res) => {
  const uploadsDir = path.join("server", "uploads");

  if (!fs.existsSync(uploadsDir)) {
    return res.status(200).json({ sessions: [] });
  }

  try {
    const sessionIds = fs.readdirSync(uploadsDir).filter((name) => {
      return fs.statSync(path.join(uploadsDir, name)).isDirectory();
    });

    const sessions = sessionIds
      .map((sessionId) => {
        const ownerPath = path.join(uploadsDir, sessionId, "owner.json");
        if (!fs.existsSync(ownerPath)) return null;

        // A single malformed/corrupt session (bad JSON, BOM, partial write,
        // a locked/renamed folder, etc.) should never take down the whole
        // History list -- skip just that one and keep going.
        try {
          const ownerData = readJsonSafe(ownerPath);
          if (ownerData.owner !== req.user.username) return null;

          let statue = null;
          let method = null;
          let stage = "not_started";
          let percent = 0;

          const manifestPath = path.join(uploadsDir, sessionId, "results", "manifest.json");
          if (fs.existsSync(manifestPath)) {
            try {
              const manifest = readJsonSafe(manifestPath);
              statue = manifest.statue;
              method = manifest.method;
            } catch (err) {
              console.error(`[history] Corrupt manifest.json for session ${sessionId}:`, err.message);
            }
          }

          const statusPath = path.join(uploadsDir, sessionId, "status.json");
          if (fs.existsSync(statusPath)) {
            try {
              const status = readJsonSafe(statusPath);
              stage = status.stage;
              percent = status.percent;
            } catch (err) {
              console.error(`[history] Corrupt status.json for session ${sessionId}:`, err.message);
            }
          }

          return {
            session_id: sessionId,
            statue,
            method,
            stage,
            percent,
            created_at: ownerData.createdAt || null,
          };
        } catch (err) {
          console.error(`[history] Skipping session ${sessionId} — corrupt owner.json:`, err.message);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({ sessions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to load history" });
  }
};

export const deleteSession = (req, res) => {
  const { session_id } = req.params;
  const sessionDir = path.join("server", "uploads", session_id);
  const ownerPath = path.join(sessionDir, "owner.json");

  if (!fs.existsSync(ownerPath)) {
    return res.status(404).json({ message: "Session not found" });
  }

  try {
    const ownerData = readJsonSafe(ownerPath);
    if (ownerData.owner !== req.user.username) {
      return res.status(403).json({ message: "Not your session" });
    }

    fs.rmSync(sessionDir, { recursive: true, force: true });
    return res.status(200).json({ message: "Session deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to delete session" });
  }
};