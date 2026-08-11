import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import LandingPage from './pages/landing-page';
import LoginPage from './pages/login-page';
import SignUpPage from './pages/signup-page';
import HomePage from './pages/home-page';
import ProcessingPage from './pages/processing-page';
import ResultsPage from './pages/results-page';
import ThreeDViewerPage from './pages/3d-viewer-page';
import HistoryPage from './pages/history-page';
import AccountSettingsPage from './pages/account-page';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => setIsLoggedIn(false);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={<LoginPage onLogin={handleLogin} />}
        />
        <Route
          path="/signup"
          element={<SignUpPage onSignUp={handleLogin} />}
        />

        {/* Main Pages */}
        <Route
          path="/home"
          element={
            <HomePage
              isLoggedIn={isLoggedIn}
              onLogout={handleLogout}
            />
          }
        />

        {/* Job Pages */}
        <Route
          path="/processing/:jobId"
          element={
            <ProcessingPage
              isLoggedIn={isLoggedIn}
              onLogout={handleLogout}
            />
          }
        />

        <Route
          path="/results/:jobId"
          element={
            <ResultsPage
              isLoggedIn={isLoggedIn}
              onLogout={handleLogout}
            />
          }
        />

        <Route
          path="/3d-viewer/:jobId"
          element={
            <ThreeDViewerPage
              isLoggedIn={isLoggedIn}
              onLogout={handleLogout}
            />
          }
        />

        {/* Other Pages */}
        <Route
          path="/history"
          element={
            <HistoryPage
              isLoggedIn={isLoggedIn}
              onLogout={handleLogout}
            />
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

        {/* Unknown Routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}