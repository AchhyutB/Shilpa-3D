import fs from "fs";
import path from "path";

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

        const ownerData = JSON.parse(fs.readFileSync(ownerPath, "utf-8"));
        if (ownerData.owner !== req.user.username) return null;

        let statue = null;
        let method = null;
        let stage = "not_started";
        let percent = 0;

        const manifestPath = path.join(uploadsDir, sessionId, "results", "manifest.json");
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
          statue = manifest.statue;
          method = manifest.method;
        }

        const statusPath = path.join(uploadsDir, sessionId, "status.json");
        if (fs.existsSync(statusPath)) {
          const status = JSON.parse(fs.readFileSync(statusPath, "utf-8"));
          stage = status.stage;
          percent = status.percent;
        }

        return {
          session_id: sessionId,
          statue,
          method,
          stage,
          percent,
          created_at: ownerData.createdAt || null,
        };
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
    const ownerData = JSON.parse(fs.readFileSync(ownerPath, "utf-8"));
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