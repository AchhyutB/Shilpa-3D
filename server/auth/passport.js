import passport from "passport";
import pkg from "passport-google-oauth20";
const { Strategy: GoogleStrategy } = pkg;
import { getUser } from "../db/dbconnection.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import crypto from "crypto";
dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const User = getUser();

        let user = await User.findOne({
          where: { email: profile.emails[0].value },
        });

        if (!user) {
          const randomPassword = crypto.randomBytes(32).toString("hex");
          const hashedPassword = await bcrypt.hash(randomPassword, 10);

          const baseUsername = profile.emails[0].value.split("@")[0];

          let username = baseUsername;
          const existingUsername = await User.findOne({ where: { username } });
          if (existingUsername) {
            username = baseUsername + "_" + profile.id.slice(0, 4);
          }

          user = await User.create({
            username,
            email: profile.emails[0].value,
            password: hashedPassword,
            provider: "google",
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    },
  ),
);

export default passport;