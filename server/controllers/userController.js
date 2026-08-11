import { generateAccessToken, generateRefreshToken } from "../auth/auth.js";
import { getUser } from "../db/dbconnection.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import fs from "fs";
import path from "path";
import { LANGUAGES, COUNTRIES, QUALITIES, RECONSTRUCTIONS } from "../constants/profileOptions.js";

// REGISTER
export const registerController = async (req, res) => {
  try {
    const User = getUser();
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existUser = await User.findOne({ where: { username } });

    if (existUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPass = await bcrypt.hash(password, 10);

    await User.create({
      username,
      email,
      password: hashedPass,
      provider: "local",
    });

    return res.status(201).json({
      message: "User Registered Successfully",
      userData: { username, email },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// LOGIN
export const loginController = async (req, res) => {
  try {
    const User = getUser();
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exist = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email: username }],
      },
    });

    if (!exist) {
      return res.status(404).json({ message: "User does not exist" });
    }

    const isValid = await bcrypt.compare(password, exist.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(exist.dataValues);
    const refreshToken = generateRefreshToken(exist.dataValues);

    await User.update(
      { refreshtoken: refreshToken },
      { where: { id: exist.id } },
    );

    res.cookie("refreshtoken", refreshToken, {
      httpOnly: true,
      secure: false,
    });

    return res.status(200).json({
      message: "User logged in",
      userData: {
        username: exist.username,
        accessToken,
        refreshToken,
      },
    });
  } catch (e) {
    console.log("ERROR:", e);
    return res.status(500).json({ message: "Internal Error" });
  }
};

// REFRESH TOKEN
export const refreshController = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshtoken;

    if (!refreshToken) {
      return res.status(403).json({ message: "Token is empty" });
    }

    const User = getUser();

    const user = await User.findOne({
      where: { refreshtoken: refreshToken },
    });

    if (!user) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const accessToken = generateAccessToken(user.dataValues);

    return res.status(200).json({ accessToken });
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

// LOGOUT
export const logoutController = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshtoken;

    if (!refreshToken) {
      return res.status(403).json({ message: "Token is empty" });
    }

    const User = getUser();

    const user = await User.findOne({
      where: { refreshtoken: refreshToken },
    });

    if (user) {
      await user.update({ refreshtoken: null });
    }

    res.clearCookie("refreshtoken", {
      httpOnly: true,
      secure: false,
    });

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    return res.status(500).json({ message: "Internal Error" });
  }
};

// PROFILE
const serializeUser = (req, user) => {
  const data = user.toJSON();
  const { avatar_filename, ...rest } = data;
  return {
    ...rest,
    avatar_url: avatar_filename
      ? `${req.protocol}://${req.get("host")}/avatars/${avatar_filename}`
      : null,
  };
};

export const profileController = async (req, res) => {
  try {
    const User = getUser();
    const user = await User.findOne({
      where: { username: req.user.username },
      attributes: { exclude: ["password", "refreshtoken"] },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ user: serializeUser(req, user) });
  } catch (error) {
    return res.status(500).json({ message: "Internal Error" });
  }
};

// UPDATE PROFILE (name, language, country, quality, default_reconstruction)
export const updateProfileController = async (req, res) => {
  try {
    const User = getUser();
    const { name, language, country, quality, default_reconstruction } = req.body;

    const updates = {};
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
        return res.status(400).json({ message: "Name must be a non-empty string under 100 characters" });
      }
      updates.name = name.trim();
    }
    if (language !== undefined) {
      if (!LANGUAGES.includes(language)) {
        return res.status(400).json({ message: `language must be one of: ${LANGUAGES.join(", ")}` });
      }
      updates.language = language;
    }
    if (country !== undefined) {
      if (!COUNTRIES.includes(country)) {
        return res.status(400).json({ message: `country must be one of: ${COUNTRIES.join(", ")}` });
      }
      updates.country = country;
    }
    if (quality !== undefined) {
      if (!QUALITIES.includes(quality)) {
        return res.status(400).json({ message: `quality must be one of: ${QUALITIES.join(", ")}` });
      }
      updates.quality = quality;
    }
    if (default_reconstruction !== undefined) {
      if (!RECONSTRUCTIONS.includes(default_reconstruction)) {
        return res.status(400).json({ message: `default_reconstruction must be one of: ${RECONSTRUCTIONS.join(", ")}` });
      }
      updates.default_reconstruction = default_reconstruction;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const user = await User.findOne({ where: { username: req.user.username } });
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.update(updates);
    return res.status(200).json({ user: serializeUser(req, user) });
  } catch (error) {
    return res.status(500).json({ message: "Internal Error" });
  }
};

// UPLOAD AVATAR
export const uploadAvatarController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No avatar file was uploaded" });
    }

    const User = getUser();
    const user = await User.findOne({ where: { username: req.user.username } });
    if (!user) return res.status(404).json({ message: "User not found" });

    // The upload middleware names the new file "user-<id>.<ext>". If the
    // previous avatar had a different extension, remove it so we don't
    // accumulate orphaned files across re-uploads.
    const newFilename = req.file.filename;
    if (user.avatar_filename && user.avatar_filename !== newFilename) {
      const oldPath = path.join("server", "uploads", "avatars", user.avatar_filename);
      fs.rm(oldPath, { force: true }, () => {});
    }

    await user.update({ avatar_filename: newFilename });
    return res.status(200).json({ user: serializeUser(req, user) });
  } catch (error) {
    return res.status(500).json({ message: "Internal Error" });
  }
};

// REMOVE AVATAR
export const removeAvatarController = async (req, res) => {
  try {
    const User = getUser();
    const user = await User.findOne({ where: { username: req.user.username } });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.avatar_filename) {
      const oldPath = path.join("server", "uploads", "avatars", user.avatar_filename);
      fs.rm(oldPath, { force: true }, () => {});
      await user.update({ avatar_filename: null });
    }

    return res.status(200).json({ user: serializeUser(req, user) });
  } catch (error) {
    return res.status(500).json({ message: "Internal Error" });
  }
};

// DELETE ACCOUNT
export const deleteAccountController = async (req, res) => {
  try {
    const User = getUser();
    const user = await User.findOne({ where: { username: req.user.username } });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.avatar_filename) {
      const avatarPath = path.join("server", "uploads", "avatars", user.avatar_filename);
      fs.rm(avatarPath, { force: true }, () => {});
    }

    // Remove this user's reconstruction sessions (owner.json marks who each
    // session belongs to — same pattern historyController uses to list them).
    const uploadsDir = path.join("server", "uploads");
    if (fs.existsSync(uploadsDir)) {
      const entries = fs.readdirSync(uploadsDir).filter((name) => {
        const full = path.join(uploadsDir, name);
        return name !== "avatars" && fs.statSync(full).isDirectory();
      });
      for (const sessionId of entries) {
        const ownerPath = path.join(uploadsDir, sessionId, "owner.json");
        if (!fs.existsSync(ownerPath)) continue;
        try {
          const ownerData = JSON.parse(fs.readFileSync(ownerPath, "utf-8"));
          if (ownerData.owner === user.username) {
            fs.rmSync(path.join(uploadsDir, sessionId), { recursive: true, force: true });
          }
        } catch {
          // malformed owner.json — leave it, not this endpoint's job to fix
        }
      }
    }

    await user.destroy();

    res.clearCookie("refreshtoken", { httpOnly: true, secure: false });
    return res.status(200).json({ message: "Account deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Internal Error" });
  }
};