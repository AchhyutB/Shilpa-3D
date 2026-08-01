import fs from "fs";
import path from "path";

export const getResults = (req, res) => {
  const { session_id } = req.params;
  const manifestPath = path.join("server", "uploads", session_id, "results", "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ message: "Results not available yet" });
  }

  try {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);
    return res.status(200).json(manifest);
  } catch (err) {
    return res.status(500).json({ message: "Failed to read results" });
  }
};

export const getFile = (req, res) => {
  const { session_id, filename } = req.params;
  const filePath = path.join("server", "uploads", session_id, "results", filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }

  return res.sendFile(path.resolve(filePath));
};