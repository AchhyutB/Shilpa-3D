import { Router } from "express";
import {
  loginController,
  registerController,
  refreshController,
  logoutController,
  profileController,
} from "../controllers/userController.js";
import {
  authenticateToken,
  generateAccessToken,
  generateRefreshToken,
} from "../auth/auth.js";
import passport from "../auth/passport.js";
import { getUser } from "../db/dbconnection.js";

const router = Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.post("/refreshtoken", refreshController);
router.post("/logout", logoutController);
router.get("/profile", authenticateToken, profileController);

// Google OAuth
router.get(
  "/auth/google",
  passport.authenticate("google", { 
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "http://localhost:5173/login",
  }),
  async (req, res) => {
    try {
      const User = getUser();
      const accessToken = generateAccessToken(req.user.dataValues);
      const refreshToken = generateRefreshToken(req.user.dataValues);

      await User.update(
        { refreshtoken: refreshToken },
        { where: { id: req.user.id } }
      );

      res.cookie("refreshtoken", refreshToken, {
        httpOnly: true,
        secure: false,
      });

      res.redirect(`http://localhost:5173/oauth?token=${accessToken}`);
    } catch (err) {
      console.error("Google callback error:", err);
      res.redirect("http://localhost:5173/login");
    }
  }
);

export default router;