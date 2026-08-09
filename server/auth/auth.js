import jwt from "jsonwebtoken";
import { getUser } from "../db/dbconnection.js";

// ACCESS_TOKEN
const generateAccessToken = (user) => {
  return jwt.sign(
    { username: user.username },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "2h",
    },
  );
};

// REFRESH_TOKEN
const generateRefreshToken = (user) => {
  return jwt.sign(
    { username: user.username },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: "7d",
    },
  );
};

// AUTHENTICATE_TOKEN — accepts Bearer header OR ?token= query param (for OAuth redirects)
// Verifies the JWT signature AND confirms the user still exists in the DB,
// so a deleted/disabled account is rejected immediately instead of staying
// "valid" until the token naturally expires.
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const queryToken = req.query.token;

  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (queryToken) {
    token = queryToken;
  }

  if (!token) {
    return res.status(401).json({ message: "Missing or malformed token" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (error, decoded) => {
    if (error) {
      return res.status(403).json({ message: "Token expired or invalid" });
    }

    try {
      const User = getUser();
      const user = await User.findOne({
        where: { username: decoded.username },
      });

      if (!user) {
        return res.status(403).json({ message: "User no longer exists" });
      }

      req.user = decoded;
      next();
    } catch (err) {
      return res.status(500).json({ message: "Internal Error" });
    }
  });
};

export { generateAccessToken, generateRefreshToken, authenticateToken };
