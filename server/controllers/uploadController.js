export const uploadImages = (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No images were uploaded" });
  }

  return res.status(200).json({ session_id: req.sessionId });
};