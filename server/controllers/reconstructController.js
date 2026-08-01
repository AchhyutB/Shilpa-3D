import fs from "fs";
import path from "path";

export const startReconstruct = async (req, res) => {
  const { session_id, statue_name, method } = req.body;

  if (!session_id || !statue_name || !method) {
    return res.status(400).json({ message: "session_id, statue_name, and method are required" });
  }

  if (!["nerf", "gaussian", "both"].includes(method)) {
    return res.status(400).json({ message: "method must be 'nerf', 'gaussian', or 'both'" });
  }

  const sessionDir = path.join("server", "uploads", session_id);
  const imagesDir = path.join(sessionDir, "images");

  if (!fs.existsSync(imagesDir)) {
    return res.status(404).json({ message: "No uploaded images found for this session_id" });
  }

  try {
    // Kick off the pipeline on wherever it actually runs (Colab bridge, etc.)
    // Fire-and-forget: we don't wait for it to finish, just confirm it started.
    fetch(`${process.env.PIPELINE_URL}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id, statue_name, method }),
    }).catch((err) => {
      console.error(`[reconstruct] Failed to reach pipeline for session ${session_id}:`, err.message);
    });

    return res.status(200).json({ status: "started" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to start reconstruction" });
  }
};