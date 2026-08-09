export const getResults = async (req, res) => {
  const { session_id } = req.params;

  try {
const response = await fetch(`${process.env.PIPELINE_URL}/jobs/${session_id}/results`, {
  headers: { "ngrok-skip-browser-warning": "true" },
});
    if (response.status === 404) {
      return res.status(404).json({ message: "Results not available yet" });
    }
    if (!response.ok) {
      return res.status(502).json({ message: "Pipeline server error" });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(404).json({ message: "Results not available yet" });
  }
};

export const getFile = async (req, res) => {
  const { session_id } = req.params;
  const filename = Array.isArray(req.params.filename) ? req.params.filename.join("/") : req.params.filename;

  try {
const response = await fetch(`${process.env.PIPELINE_URL}/jobs/${session_id}/results`, {
  headers: { "ngrok-skip-browser-warning": "true" },
});
    if (!response.ok) {
      return res.status(404).json({ message: "File not found" });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.set("Content-Type", response.headers.get("content-type") || "application/octet-stream");
    return res.send(buffer);
  } catch (err) {
    return res.status(502).json({ message: "Failed to fetch file from pipeline" });
  }
};