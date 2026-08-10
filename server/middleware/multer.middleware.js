import multer from "multer";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import crypto from "crypto";

export const assignSessionId = async (req, res, next) => {
  try {
    req.sessionId = crypto.randomUUID();

    const sessionDir = path.join("server", "uploads", req.sessionId);
    const imagesDir = path.join(sessionDir, "images");

    // create both dirs up front, once, so multer's destination callback
    // below doesn't need to touch the filesystem per-file
    await fs.mkdir(imagesDir, { recursive: true });
    await fs.writeFile(
      path.join(sessionDir, "owner.json"),
      JSON.stringify({
        owner: req.user?.username || null,
        createdAt: new Date().toISOString(),
      })
    );

    next();
  } catch (err) {
    next(err);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // dir already created in assignSessionId — no sync fs call per file
    const dir = path.join("server", "uploads", req.sessionId, "images");
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
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