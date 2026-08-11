import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Header({
  onLogout,
  username,
  displayName,
  avatar,
}) {
  const navigate = useNavigate();

  const profileName = displayName || username || "User";

  return (
    <header className="fixed top-0 left-0 right-0 border-b border-border/30 backdrop-blur-sm z-50 bg-background/80">
      <div className="max-w-7xl mx-auto px-2 py-2 flex justify-between items-center">

        {/* Logo */}
        <button
          onClick={() => navigate("/home")}
          className="hover:opacity-80 transition-opacity"
        >
          <img
            src="/assets/main.png"
            alt="Shilpa3D Logo"
            className="w-22.5 h-auto object-contain"
          />
        </button>

        {/* Navigation */}
        <nav className="flex items-center gap-8">

          {/* History */}
          <button
            onClick={() => navigate("/history")}
            className="text-foreground hover:text-accent transition-colors"
          >
            History
          </button>

          {/* Sign Out */}
          <button
            onClick={() => {
              onLogout();
              navigate("/");
            }}
            className="text-foreground hover:text-accent transition-colors"
          >
            Sign Out
          </button>

          {/* Profile */}
          <button
            onClick={() => navigate("/account")}
            className="flex items-center gap-2 bg-secondary/40 rounded-full px-4 py-2 hover:bg-secondary/60 transition-colors"
          >
            {avatar ? (
              <img
                src={avatar}
                alt="Profile"
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-secondary">
                <User
                  size={18}
                  className="text-accent"
                />
              </div>
            )}

            <span className="text-foreground font-serif">
              {profileName}
            </span>
          </button>

        </nav>
      </div>
    </header>
  );
}