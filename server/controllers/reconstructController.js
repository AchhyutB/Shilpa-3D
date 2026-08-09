import fs from "fs";
import path from "path";

export const startReconstruct = async (req, res) => {
  const { session_id, statue_name, method } = req.body;

  if (!session_id || !statue_name || !method) {
    return res
      .status(400)
      .json({ message: "session_id, statue_name, and method are required" });
  }

  if (!["nerf", "gaussian", "both"].includes(method)) {
    return res
      .status(400)
      .json({ message: "method must be 'nerf', 'gaussian', or 'both'" });
  }

  const sessionDir = path.join("server", "uploads", session_id);
  const imagesDir = path.join(sessionDir, "images");
  const statusPath = path.join(sessionDir, "status.json");

  if (!fs.existsSync(imagesDir)) {
    return res
      .status(404)
      .json({ message: "No uploaded images found for this session_id" });
  }

  const writeErrorStatus = (reason) => {
    try {
      fs.writeFileSync(
        statusPath,
        JSON.stringify({ stage: "error", percent: -1 }),
      );
    } catch (writeErr) {
      console.error(
        `[reconstruct] Also failed to write error status for session ${session_id}:`,
        writeErr.message,
      );
    }
  };

  try {
    const formData = new FormData();
    formData.append("session_id", session_id);
    formData.append("statue_name", statue_name);
    formData.append("method", method);

    const imageFiles = fs.readdirSync(imagesDir);
    for (const filename of imageFiles) {
      const filePath = path.join(imagesDir, filename);
      const fileBuffer = fs.readFileSync(filePath);
      const blob = new Blob([fileBuffer]);
      formData.append("images", blob, filename);
    }

    // Fire-and-forget: forward images + start the job on the Colab bridge
    fetch(`${process.env.PIPELINE_URL}/jobs`, {
      method: "POST",
      headers: { "ngrok-skip-browser-warning": "true" },
      body: formData,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Pipeline responded ${res.status}`);
      })
      .catch((err) => {
        console.error(
          `[reconstruct] Failed to reach pipeline for session ${session_id}:`,
          err.message,
        );
        writeErrorStatus(
          `Could not reach the reconstruction pipeline: ${err.message}`,
        );
      });

    return res.status(200).json({ status: "started", session_id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to start reconstruction" });
  }
};
