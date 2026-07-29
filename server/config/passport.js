const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcrypt");
const { User } = require("..");

// --- Local strategy (username/password) ---
passport.use(
  new LocalStrategy(
    { usernameField: "username", passwordField: "password" },
    async (username, password, done) => {
      try {
        const user = await User.findOne({ where: { username } });
        if (!user)
          return done(null, false, { message: "Invalid username or password" });
        if (user.provider !== "local") {
          return done(null, false, {
            message: `This account uses ${user.provider} login. Try "Continue with Google" instead.`,
          });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match)
          return done(null, false, { message: "Invalid username or password" });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

// --- Google OAuth2 strategy ---
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, // e.g. http://localhost:5000/api/auth/google/callback
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
          profile.emails && profile.emails[0] && profile.emails[0].value;

        // Match an existing google user, or an existing local user with the same email
        let user = await User.findOne({
          where: { provider: "google", providerId: profile.id },
        });

        if (!user && email) {
          user = await User.findOne({ where: { email } });
          if (user && user.provider === "local") {
            // Email already registered locally — don't silently merge/hijack it
            return done(null, false, {
              message:
                "An account with this email already exists. Log in with your password instead.",
            });
          }
        }

        if (!user) {
          user = await User.create({
            username: profile.displayName || email.split("@")[0],
            email,
            provider: "google",
            providerId: profile.id,
            password: null,
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

// Not using sessions (we issue JWTs), but passport requires these to exist
// if session middleware is ever enabled elsewhere in the app.
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
