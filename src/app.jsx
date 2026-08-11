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
import AccountSettingsPage from './pages/account-page';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("accessToken"),
  );
  const [username, setUsername] = useState(
    localStorage.getItem("username") || "",
  );

  const handleLogin = () => {
    setIsLoggedIn(true);
    setUsername(localStorage.getItem("username") || "");
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // token might already be stale — clear local state regardless
    }
    setIsLoggedIn(false);
    setUsername("");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("username");
  };

  // fetch profile on refresh or after Google OAuth
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;

    authService
      .me()
      .then(({ user }) => {
        if (cancelled) return;
        if (!user) {
          handleLogout();
          return;
        }
        setUsername(user.username);
        localStorage.setItem("username", user.username);
      })
      .catch(() => {
        if (!cancelled) handleLogout();
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // global axios interceptor — auto logout on 401 (token expired or user deleted)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          setIsLoggedIn(false);
          setUsername("");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("username");
        }
        return Promise.reject(error);
      },
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/signup" element={<SignUpPage onSignUp={handleLogin} />} />
        <Route
          path="/home"
          element={
            isLoggedIn ? (
              <HomePage
                isLoggedIn={isLoggedIn}
                onLogout={handleLogout}
                username={username}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/processing"
          element={
            isLoggedIn ? (
              <ProcessingPage
                isLoggedIn={isLoggedIn}
                onLogout={handleLogout}
                username={username}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/results"
          element={
            isLoggedIn ? (
              <ResultsPage
                isLoggedIn={isLoggedIn}
                onLogout={handleLogout}
                username={username}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/3d-viewer"
          element={
            isLoggedIn ? (
              <ThreeDViewerPage
                isLoggedIn={isLoggedIn}
                onLogout={handleLogout}
                username={username}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/history"
          element={
            isLoggedIn ? (
              <HistoryPage
                isLoggedIn={isLoggedIn}
                onLogout={handleLogout}
                username={username}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
         <Route
          path="/account"
          element={
            <AccountSettingsPage
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/oauth"
          element={
            <OAuthPage onLogin={handleLogin} setUsername={setUsername} />
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
