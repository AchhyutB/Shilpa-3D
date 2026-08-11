import { DataTypes } from "sequelize";

const createUserModel = (sequelize) => {
  const User = sequelize.define("User", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    refreshtoken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    provider: {
      type: DataTypes.ENUM("local", "google"),
      allowNull: false,
      defaultValue: "local",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    language: {
      type: DataTypes.STRING,
      defaultValue: "English",
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    quality: {
      type: DataTypes.STRING,
      defaultValue: "Standard",
    },
    default_reconstruction: {
      type: DataTypes.STRING,
      defaultValue: "Gaussian Splat",
    },
    avatar_filename: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });
  return User;
};

export default createUserModel;
