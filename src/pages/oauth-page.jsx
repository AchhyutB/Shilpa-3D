import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "../lib/authServices";
import axios from "axios";

export default function OAuthPage({ onLogin, setUsername }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      authService.saveGoogleToken(token);

      fetch("http://localhost:8081/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      })
      .then(res => res.json())
      .then(data => {
        const username = data.user?.username || "";
        localStorage.setItem("username", username);
        if (setUsername) setUsername(username);
        onLogin?.();
        navigate("/home");
      })
      .catch(() => navigate("/login"));

    } else {
      navigate("/login");
    }
  }, [searchParams, navigate, onLogin, setUsername]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-secondary font-mono">Signing you in…</p>
    </div>
  );
}