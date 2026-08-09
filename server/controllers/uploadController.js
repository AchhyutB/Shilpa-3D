export const uploadImages = (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No images were uploaded" });
  }

  if (req.files.length < 5) {
    return res.status(400).json({ message: "At least 5 images are required" });
  }

  return res.status(200).json({ session_id: req.sessionId, image_count: req.files.length });
};