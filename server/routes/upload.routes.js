import { Router } from "express";
import upload, { assignSessionId } from "../middleware/multer.middleware.js";
import { uploadImages } from "../controllers/uploadController.js";
import { getStatus } from "../controllers/statusController.js";
import { getResults, getFile } from "../controllers/resultsController.js";
import { startReconstruct } from "../controllers/reconstructController.js";
import { authenticateToken } from "../auth/auth.js";
import { requireOwnership } from "../middleware/ownership.middleware.js";

const router = Router();

router.post("/upload", authenticateToken, assignSessionId, upload.array("images", 40), uploadImages);
router.post("/reconstruct", authenticateToken, requireOwnership, startReconstruct);
router.get("/status/:session_id", authenticateToken, requireOwnership, getStatus);
router.get("/results/:session_id", authenticateToken, requireOwnership, getResults);
router.get("/files/:session_id/:filename", authenticateToken, requireOwnership, getFile);

export default router;