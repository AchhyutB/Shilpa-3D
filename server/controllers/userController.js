import { generateAccessToken, generateRefreshToken } from "../auth/auth.js";
import { getUser } from "../db/dbconnection.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";

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
export const profileController = async (req, res) => {
  try {
    const User = getUser();
    const user = await User.findOne({
      where: { username: req.user.username },
      attributes: { exclude: ["password", "refreshtoken"] },
    });
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Internal Error" });
  }
};