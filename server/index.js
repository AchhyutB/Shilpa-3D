import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { dbConnection } from "./db/dbconnection.js";
import passport from "./auth/passport.js";
import authRoutes from "./routes/auth.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use("/api", authRoutes);
app.use("/api", uploadRoutes);

const start = async () => {
  await dbConnection();
  app.listen(8081, () => {
    console.log("Server is running on port: 8081");
  });
};

start();