import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import DeviceLayout from './pages/DeviceLayout';
import Overview from './pages/Overview';
import AIPage from './pages/AIPage';
import PowerPage from './pages/PowerPage';
import TemperaturePage from './pages/TemperaturePage';
import VibrationPage from './pages/VibrationPage';
import FaultsPage from './pages/FaultsPage';
import TerminalPage from './pages/TerminalPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import { isAuthenticated, logout } from './auth';
import './App.css';

function ProtectedRoute({ isLoggedIn, children }) {
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <Home onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/about"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <AboutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/device/:deviceId"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <DeviceLayout onLogout={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="ai" element={<AIPage />} />
          <Route path="power" element={<PowerPage />} />
          <Route path="temperature" element={<TemperaturePage />} />
          <Route path="vibration" element={<VibrationPage />} />
          <Route path="faults" element={<FaultsPage />} />
          <Route path="terminal" element={<TerminalPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="about" element={<AboutPage />} />
        </Route>
        <Route path="*" element={<Navigate to={isLoggedIn ? "/" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
