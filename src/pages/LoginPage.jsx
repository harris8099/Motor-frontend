import { useState, useEffect } from 'react';
import { Lock, ShieldCheck, Sun, Moon } from 'lucide-react';
import { login } from '../auth';
import './LoginPage.css';

const THEME_STORAGE_KEY = 'frontend-theme';

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [theme, setTheme] = useState('light');

  // Apply saved theme on mount
  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme = storedTheme === 'light' || storedTheme === 'dark' 
      ? storedTheme 
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const loggedInUser = await login(username, password);
      if (!loggedInUser) {
        setError('Invalid username or password.');
        setIsLoading(false);
        return;
      }
      onLogin(loggedInUser);
    } catch (err) {
      setError('Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <button 
        type="button"
        className="login-theme-toggle"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>
      <div className="login-shell">
        <section className="login-hero">
          <div className="login-kicker">Secure Access Gate</div>
          <h1>Smart Motor Command Center</h1>
          <p>
            Securely access your motor monitoring dashboard with backend authentication.
          </p>
          <div className="login-note">
            <ShieldCheck size={18} />
            <span>
              Secure login with encrypted password storage
            </span>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-panel__header">
            <div className="login-icon">
              <Lock size={20} />
            </div>
            <div>
              <h2>Sign In</h2>
              <p>Enter your credentials to access the dashboard.</p>
            </div>
          </div>

          <div className="login-visitor-card" aria-label="Visitor login credentials">
            <div className="login-visitor-card__header">
              <span className="login-visitor-badge">Visitor Login</span>
              <button
                type="button"
                className="login-visitor-fill"
                onClick={() => {
                  setUsername('user');
                  setPassword('password');
                  setError('');
                }}
              >
                Use These Credentials
              </button>
            </div>
            <p className="login-visitor-card__text">
              Sign in with the visitor account shown below.
            </p>
            <div className="login-visitor-credentials">
              <div className="login-visitor-credential">
                <span>Username</span>
                <strong>user</strong>
              </div>
              <div className="login-visitor-credential">
                <span>Password</span>
                <strong>password</strong>
              </div>
            </div>
            <div className="login-visitor-hint" role="note" aria-label="Backend loading notice">
              <span className="login-visitor-hint__label">Please Note</span>
              <strong>The backend may take a little time to load.</strong>
              <span>Please be patient while signing in.</span>
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              required
            />

            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
