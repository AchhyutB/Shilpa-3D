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

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => setIsLoggedIn(false);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/signup" element={<SignUpPage onSignUp={handleLogin} />} />
        <Route path="/home" element={<HomePage isLoggedIn={isLoggedIn} onLogout={handleLogout} />} />
        <Route path="/processing" element={<ProcessingPage isLoggedIn={isLoggedIn} onLogout={handleLogout} />} />
        <Route path="/results" element={<ResultsPage isLoggedIn={isLoggedIn} onLogout={handleLogout} />} />
        <Route path="/3d-viewer" element={<ThreeDViewerPage isLoggedIn={isLoggedIn} onLogout={handleLogout} />} />
        <Route path="/history" element={<HistoryPage isLoggedIn={isLoggedIn} onLogout={handleLogout} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}