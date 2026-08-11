import multer from "multer";
import fs from "fs";
import path from "path";

const AVATAR_DIR = path.join("server", "uploads", "avatars");
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    // req.user comes from the JWT payload, which only carries { username } —
    // there's no numeric id available here, so key the filename off a
    // filesystem-safe version of the username instead. A re-upload with the
    // same extension overwrites the old file; see the controller for cleanup
    // when the extension changes.
    const safeUsername = req.user.username.replace(/[^a-zA-Z0-9_-]/g, "_");
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `user-${safeUsername}${ext}`);
  },
});

const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, or WEBP images are allowed"));
    }
  },
});

export default avatarUpload;