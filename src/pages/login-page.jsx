import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage({ onNavigate, onLogin }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isFormValid =
    formData.username.trim() !== '' &&
    formData.password.trim() !== '';

  const handleSubmit = (e) => {
  e.preventDefault();
  if (isFormValid) {
    onLogin();
    navigate('/home'); 
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
        <div className="bg-card-foreground border border-border/30 rounded-3xl p-10 space-y-6">

          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img
              src="/assets/main.png"
              alt="Shilpa3D Logo"
              className="w-[140px] h-auto object-contain"
            />
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-4xl font-medium font-sans text-background">
              Login
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Username */}
            <div className="space-y-2">
              <label className="text-sm text-muted font-medium font-mono">
                Username
              </label>
              <Input
                type="text"
                placeholder="Enter username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="!bg-secondary-foreground border-2 border-border h-14 px-5 rounded-xl mt-1 text-secondary placeholder:text-secondary/40 font-mono"
                required
              />
            </div>

            {/* Password */}
              <div className="space-y-2">
                <label className="text-sm text-muted font-medium font-mono">
                  Password
                </label>

                <div className="relative mt-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="!bg-secondary-foreground border-2 border-border h-14 px-5 pr-12 rounded-xl text-secondary placeholder:text-secondary/40 font-mono"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-4 flex items-center text-muted hover:text-secondary transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked)}
                />
                <label htmlFor="remember" className="text-sm font-mono text-secondary cursor-pointer">
                  Remember me
                </label>
              </div>
              <Button variant="link" className="text-sm font-mono text-secondary cursor-pointer hover:text-secondary/40 p-0 h-auto">
                Forgot Password?
              </Button>
            </div>

            {/* Submit */}
            <div className="flex justify-center">
              <Button
                type="submit"
                disabled={!isFormValid}
                className={`w-60 py-6 text-lg rounded-full font-serif transition-all ${
                  isFormValid
                    ? 'bg-accent text-background hover:bg-accent/90 cursor-pointer'
                    : 'bg-accent text-background cursor-not-allowed'
                }`}
              >
                Login
              </Button>
            </div>
          </form>

          {/* Sign up link */}
          <div className="text-center font-mono text-sm text-muted">
            Don't have an account?{' '}
            <Button
              variant="link"
              onClick={() => navigate('/signup')}
              className="text-accent hover:text-accent/80 p-0 h-auto"
            >
              Sign up
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}