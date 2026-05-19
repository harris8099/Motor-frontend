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
import { getStoredUser, isAuthenticated, logout } from './auth';
import './App.css';

function ProtectedRoute({ user, children }) {
  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  const [user, setUser] = useState(isAuthenticated() ? getStoredUser() : null);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  const isLoggedIn = !!user;

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
            <ProtectedRoute user={user}>
              <Home onLogout={handleLogout} userRole={user?.role} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/about"
          element={
            <ProtectedRoute user={user}>
              <AboutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/device/:deviceId"
          element={
            <ProtectedRoute user={user}>
              <DeviceLayout onLogout={handleLogout} userRole={user?.role} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<Overview userRole={user?.role} />} />
          <Route path="ai" element={<AIPage userRole={user?.role} />} />
          <Route path="power" element={<PowerPage />} />
          <Route path="temperature" element={<TemperaturePage />} />
          <Route path="vibration" element={<VibrationPage />} />
          <Route path="faults" element={<FaultsPage userRole={user?.role} />} />
          <Route path="terminal" element={<TerminalPage />} />
          <Route path="settings" element={<SettingsPage userRole={user?.role} />} />
          <Route path="about" element={<AboutPage />} />
        </Route>
        <Route path="*" element={<Navigate to={isLoggedIn ? "/" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
