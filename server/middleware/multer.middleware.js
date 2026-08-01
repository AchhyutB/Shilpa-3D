import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const assignSessionId = (req, res, next) => {
  req.sessionId = crypto.randomUUID();

  const sessionDir = path.join("server", "uploads", req.sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessionDir, "owner.json"),
    JSON.stringify({ owner: req.user?.username || null })
  );

  next();
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join("server", "uploads", req.sessionId, "images");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per image, adjust if needed
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG/PNG images are allowed"));
    }
  },
});

export default upload;