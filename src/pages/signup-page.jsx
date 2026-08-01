import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useNavigate } from "react-router-dom";
import { FaGoogle } from "react-icons/fa";
import { authService } from "../lib/authServices";

// Returns a 0–4 score based on length + character variety.
// No single rule is "required" — this just informs the strength label.
function getPasswordScore(password) {
  if (!password) return 0;

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  return score; // 0–4
}

function getPasswordStrength(password) {
  const score = getPasswordScore(password);
  if (score <= 1) return "Weak";
  if (score <= 2) return "Medium";
  return "Strong";
}

export default function SignUpPage({ onNavigate, onSignUp }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const passwordStrength = getPasswordStrength(formData.password);

  const strengthColor =
    passwordStrength === "Weak"
      ? "bg-red-500"
      : passwordStrength === "Medium"
        ? "bg-orange-400"
        : "bg-green-500";

  const strengthWidth =
    passwordStrength === "Weak"
      ? "w-1/3"
      : passwordStrength === "Medium"
        ? "w-2/3"
        : "w-full";

  const passwordsMatch =
    formData.password === formData.confirmPassword && formData.password !== "";

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Enter your name");
      return;
    }
    if (!formData.email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    try {
      setError("");
      setSubmitting(true);
      await authService.signup(
        formData.name,
        formData.email,
        formData.password,
      );
      onSignUp();
      navigate("/login"); // no auto-login on register — backend doesn't issue tokens on /register
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignUp = () => {
    window.location.href = authService.googleLoginUrl;
  };

  const handleLoginClick = () => {
    if (onNavigate) {
      onNavigate("login");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="bg-card-foreground border border-border/30 rounded-2xl p-5 space-y-3">
          {/* Logo */}
          <div className="flex justify-center">
            <img
              src="/assets/main.png"
              alt="Shilpa3D Logo"
              className="w-18 h-auto object-contain"
            />
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-xl font-serif text-background">Sign Up</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-2.5" noValidate>
            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs text-muted font-medium font-mono">
                Name*
              </label>
              <Input
                type="text"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="bg-secondary-foreground! border-2 border-border h-14 px-5 rounded-lg mt-0.5 text-secondary placeholder:text-secondary/40 font-mono text-sm"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs text-muted font-medium font-mono">
                Email*
              </label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="bg-secondary-foreground! border-2 border-border h-14 px-5 rounded-lg mt-0.5 text-secondary placeholder:text-secondary/40 font-mono text-sm"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs text-muted font-medium font-mono">
                Password*
              </label>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password: e.target.value,
                    })
                  }
                  className="bg-secondary-foreground! border-2 border-border h-14 px-5 pr-12 rounded-lg text-secondary placeholder:text-secondary/40 font-mono text-sm"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted hover:text-secondary"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {formData.password && (
                <>
                  <div className="w-full h-1.5 rounded-full bg-secondary/40 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strengthColor} ${strengthWidth}`}
                    />
                  </div>

                  <p
                    className={`text-[11px] font-mono ${
                      passwordStrength === "Weak"
                        ? "text-red-500"
                        : passwordStrength === "Medium"
                          ? "text-orange-400"
                          : "text-green-500"
                    }`}
                  >
                    Password Strength: {passwordStrength}
                  </p>
                </>
              )}
            </div>
            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs text-muted font-medium font-mono">
                Re-enter Password*
              </label>

              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className={`bg-secondary-foreground! border-2 h-14 px-5 pr-12 rounded-lg mt-0.5 text-secondary placeholder:text-secondary/40 font-mono text-sm ${
                    formData.confirmPassword && !passwordsMatch
                      ? "border-red-500"
                      : "border-border"
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted hover:text-secondary"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>

              {formData.confirmPassword && !passwordsMatch && (
                <p className="text-[11px] text-red-500">
                  Passwords do not match
                </p>
              )}
            </div>

            {error && (
              <p className="text-[11px] text-red-500 text-center font-mono">
                {error}
              </p>
            )}

            {/* Submit */}
            <div className="flex justify-center pt-1">
              <Button
                type="submit"
                disabled={submitting}
                className="w-48 h-14 text-sm rounded-full font-serif transition-all duration-300 bg-accent text-background hover:bg-accent/90 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Signing up…" : "Sign Up"}
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/30" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-card-foreground text-muted font-mono">
                Or login with
              </span>
            </div>
          </div>

          {/* Social Login */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              type="button"
              className="w-full h-14 rounded-lg border-2 bg-card-foreground! border-border! text-background! hover:bg-secondary transition-all font-medium gap-2 text-sm"
              onClick={handleGoogleSignUp}
            >
              <FaGoogle className="h-4 w-4" />
              Continue with Google
            </Button>
          </div>

          {/* Login link */}
          <div className="text-center text-xs text-muted font-mono">
            Already have an account?{" "}
            <Button
              variant="link"
              type="button"
              onClick={handleLoginClick}
              className="text-accent hover:text-accent/80 p-0 h-auto font-mono"
            >
              Login
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
