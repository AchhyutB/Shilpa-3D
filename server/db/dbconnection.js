import dotenv from "dotenv";
dotenv.config();

import { Sequelize } from "sequelize";
import createUserModel from "../model/userModel.js";

let User = null;

export const dbConnection = async () => {
  const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      dialect: "postgres",
      logging: false,
    },
  );
  try {
    await sequelize.authenticate();
    User = createUserModel(sequelize);

    console.log("DB connected successfully.");
    return sequelize;
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    throw error;
  }
};

export const getUser = () => User;