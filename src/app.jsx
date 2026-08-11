import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";

import { authService } from "./lib/authServices";

import LandingPage from "./pages/landing-page";
import LoginPage from "./pages/login-page";
import SignUpPage from "./pages/signup-page";
import HomePage from "./pages/home-page";
import ProcessingPage from "./pages/processing-page";
import ResultsPage from "./pages/results-page";
import ThreeDViewerPage from "./pages/3d-viewer-page";
import HistoryPage from "./pages/history-page";
import OAuthPage from "./pages/oauth-page";
import AccountSettingsPage from "./pages/account-page";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("accessToken")
  );

  const [username, setUsername] = useState(
    localStorage.getItem("username") || ""
  );

  const [displayName, setDisplayName] = useState(
    localStorage.getItem("displayName") || ""
  );

  const [avatar, setAvatar] = useState(
    localStorage.getItem("avatar") || null
  );

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------

  const handleLogin = () => {
    setIsLoggedIn(true);

    setUsername(localStorage.getItem("username") || "");
    setDisplayName(localStorage.getItem("displayName") || "");
    setAvatar(localStorage.getItem("avatar") || null);
  };

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Token might already be stale.
      // Clear local state regardless.
    }

    setIsLoggedIn(false);
    setUsername("");
    setDisplayName("");
    setAvatar(null);

    localStorage.removeItem("accessToken");
    localStorage.removeItem("username");
    localStorage.removeItem("displayName");
    localStorage.removeItem("avatar");
  };

  // --------------------------------------------------
  // UPDATE PROFILE STATE
  // --------------------------------------------------

  const handleProfileChange = (user) => {
    if (!user) return;

    const newUsername = user.username || "";
    const newDisplayName = user.name || "";
    const newAvatar = user.avatar_url || null;

    setUsername(newUsername);
    setDisplayName(newDisplayName);
    setAvatar(newAvatar);

    localStorage.setItem("username", newUsername);
    localStorage.setItem("displayName", newDisplayName);

    if (newAvatar) {
      localStorage.setItem("avatar", newAvatar);
    } else {
      localStorage.removeItem("avatar");
    }
  };

  // --------------------------------------------------
  // FETCH PROFILE ON REFRESH / GOOGLE OAUTH
  // --------------------------------------------------

  useEffect(() => {
    if (!isLoggedIn) return;

    let cancelled = false;

    authService
      .getProfile()
      .then(({ user }) => {
        if (cancelled) return;

        if (!user) {
          handleLogout();
          return;
        }

        handleProfileChange(user);
      })
      .catch(() => {
        if (!cancelled) {
          handleLogout();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // --------------------------------------------------
  // GLOBAL AXIOS 401 INTERCEPTOR
  // --------------------------------------------------

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,

      (error) => {
        if (error.response?.status === 401) {
          setIsLoggedIn(false);
          setUsername("");
          setDisplayName("");
          setAvatar(null);

          localStorage.removeItem("accessToken");
          localStorage.removeItem("username");
          localStorage.removeItem("displayName");
          localStorage.removeItem("avatar");
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // --------------------------------------------------
  // COMMON HEADER PROPS
  // --------------------------------------------------

  const headerProps = {
    username,
    displayName,
    avatar,
    onLogout: handleLogout,
  };

  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC */}
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/login"
          element={<LoginPage onLogin={handleLogin} />}
        />

        <Route
          path="/signup"
          element={<SignUpPage onSignUp={handleLogin} />}
        />

        <Route
          path="/oauth"
          element={
            <OAuthPage
              onLogin={handleLogin}
              setUsername={setUsername}
            />
          }
        />

        {/* HOME */}
        <Route
          path="/home"
          element={
            isLoggedIn ? (
              <HomePage
                isLoggedIn={isLoggedIn}
                onLogout={handleLogout}
                username={username}
                displayName={displayName}
                avatar={avatar}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* PROCESSING */}
        <Route
          path="/processing"
          element={
            isLoggedIn ? (
              <ProcessingPage
                isLoggedIn={isLoggedIn}
                onLogout={handleLogout}
                username={username}
                displayName={displayName}
                avatar={avatar}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* RESULTS */}
        <Route
          path="/results"
          element={
            isLoggedIn ? (
              <ResultsPage
                isLoggedIn={isLoggedIn}
                onLogout={handleLogout}
                username={username}
                displayName={displayName}
                avatar={avatar}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 3D VIEWER */}
        <Route
          path="/3d-viewer"
          element={
            isLoggedIn ? (
              <ThreeDViewerPage
                isLoggedIn={isLoggedIn}
                onLogout={handleLogout}
                username={username}
                displayName={displayName}
                avatar={avatar}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* HISTORY */}
        <Route
          path="/history"
          element={
            isLoggedIn ? (
              <HistoryPage
                isLoggedIn={isLoggedIn}
                onLogout={handleLogout}
                username={username}
                displayName={displayName}
                avatar={avatar}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* ACCOUNT SETTINGS */}
        <Route
          path="/account"
          element={
            isLoggedIn ? (
              <AccountSettingsPage
                onLogout={handleLogout}
                username={username}
                displayName={displayName}
                avatar={avatar}
                onProfileChange={handleProfileChange}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* FALLBACK */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}