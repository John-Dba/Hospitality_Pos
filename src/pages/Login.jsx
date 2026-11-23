import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BedDouble,
  ClipboardCheck,
  Eye,
  EyeOff,
  Lock,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  UtensilsCrossed,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { APP_NAME, DEMO_USERS, HOTEL_NAME, ROLE_LABELS } from '../data/constants';
import { Spinner } from '../components/ui';

export default function Login() {
  const { user, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const fillDemo = (account) => {
    setUsername(account.username);
    setPassword(account.password);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both your username and password.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await login(username, password);
    setLoading(false);
    if (result.ok) {
      navigate(from, { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="login-page">
      <aside className="login-brand">
        <div className="brand-top">
          <span className="brand-logo large">
            <UtensilsCrossed size={24} />
          </span>
          <div>
            <strong>{APP_NAME}</strong>
            <small>{HOTEL_NAME}</small>
          </div>
        </div>

        <div className="brand-copy">
          <span className="pill">
            <Sparkles size={14} /> Hospitality POS Training
          </span>
          <h1>Practice hotel and restaurant operations in one POS workspace.</h1>
          <p>
            A hands-on learning environment for orders, kitchen operations,
            housekeeping, inventory, payments and staff roles.
          </p>

          <ul className="brand-features">
            <li>
              <span className="feature-icon"><ShieldCheck size={18} /></span>
              <div>
                <strong>Role-based access</strong>
                <small>Nine roles mapped to common hospitality POS responsibilities.</small>
              </div>
            </li>
            <li>
              <span className="feature-icon"><ClipboardCheck size={18} /></span>
              <div>
                <strong>Live order flow</strong>
                <small>From waiter entry to kitchen completion.</small>
              </div>
            </li>
            <li>
              <span className="feature-icon"><BedDouble size={18} /></span>
              <div>
                <strong>Rooms &amp; stock control</strong>
                <small>Housekeeping status and low-stock alerts.</small>
              </div>
            </li>
          </ul>
        </div>

        <div className="brand-foot">
          <div className="brand-stats">
            <span><strong>7</strong> user roles</span>
            <span><strong>8</strong> tables</span>
            <span><strong>8</strong> rooms</span>
          </div>
          <small>A general training workspace for hospitality operations.</small>
        </div>
      </aside>

      <main className="login-panel">
        <button
          type="button"
          className="icon-btn login-theme"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        <div className="login-card">
          <div className="login-mobile-brand">
            <span className="brand-logo">
              <UtensilsCrossed size={20} />
            </span>
            <strong>{APP_NAME}</strong>
          </div>

          <header className="login-head">
            <h2>Welcome back</h2>
            <p>Sign in to open your workspace.</p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span>Username</span>
              <div className="input-wrap">
                <User size={17} />
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="e.g. admin"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </label>

            <label className="field">
              <span>Password</span>
              <div className="input-wrap">
                <Lock size={17} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            {error && (
              <div className="form-error" role="alert">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? (
                <>
                  <Spinner size={16} /> Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <div className="login-divider">
            <span>Practice accounts · click to autofill</span>
          </div>

          <div className="demo-grid">
            {DEMO_USERS.map((account) => (
              <button
                key={account.id}
                type="button"
                className="demo-card"
                onClick={() => fillDemo(account)}
              >
                <span className="demo-role">{ROLE_LABELS[account.role]}</span>
                <span className="demo-creds">
                  <code>{account.username}</code>
                  <code>{account.password}</code>
                </span>
              </button>
            ))}
          </div>

          <p className="login-note">
            Training build. Practice credentials and data stay in this browser.
          </p>
        </div>
      </main>
    </div>
  );
}
