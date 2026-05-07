import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated, logout } from './auth';
import './App.css';

const Home = lazy(() => import('./pages/Home'));
const DeviceLayout = lazy(() => import('./pages/DeviceLayout'));
const Overview = lazy(() => import('./pages/Overview'));
const AIPage = lazy(() => import('./pages/AIPage'));
const PowerPage = lazy(() => import('./pages/PowerPage'));
const TemperaturePage = lazy(() => import('./pages/TemperaturePage'));
const VibrationPage = lazy(() => import('./pages/VibrationPage'));
const FaultsPage = lazy(() => import('./pages/FaultsPage'));
const TerminalPage = lazy(() => import('./pages/TerminalPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

function ProtectedRoute({ isLoggedIn, children }) {
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary, #0b1220)',
        color: 'var(--text-primary, #ffffff)',
        padding: '2rem',
      }}
    >
      <div
        style={{
          width: 'min(420px, 100%)',
          borderRadius: '18px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.04)',
          padding: '1.25rem 1.4rem',
          boxShadow: '0 20px 50px rgba(0,0,0,0.22)',
        }}
      >
        <div
          style={{
            height: '14px',
            width: '38%',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.10)',
            marginBottom: '1rem',
          }}
        />
        <div
          style={{
            height: '12px',
            width: '100%',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.07)',
            marginBottom: '0.7rem',
          }}
        />
        <div
          style={{
            height: '12px',
            width: '82%',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.07)',
          }}
        />
      </div>
    </div>
  );
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
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
    </Router>
  );
}

export default App;
