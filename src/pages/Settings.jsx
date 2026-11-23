import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Info,
  Moon,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sun,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAppData } from '../context/DataContext';
import { APP_NAME, ROLE_LABELS, ROLE_RESPONSIBILITIES } from '../data/constants';
import { Avatar, Badge, PageHeader } from '../components/ui';

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { resetData } = useAppData();

  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
  });
  const [toast, setToast] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const saveProfile = (event) => {
    event.preventDefault();
    updateProfile({
      name: form.name.trim() || user.name,
      email: form.email.trim(),
      phone: form.phone.trim(),
    });
    setToast('Profile updated successfully.');
  };

  const handleReset = () => {
    resetData();
    setConfirmReset(false);
    setToast('Training data restored to its original state.');
  };

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, appearance and training workspace."
      />

      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} /> {toast}
        </div>
      )}

      <div className="settings-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <h3><Palette size={17} /> Appearance</h3>
              <p>Choose how the workspace looks on this device.</p>
            </div>
          </div>
          <div className="theme-options">
            <button
              type="button"
              className={`theme-option ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
            >
              <span className="theme-preview light">
                <span /><span /><span />
              </span>
              <span className="theme-label">
                <Sun size={16} /> Light mode
              </span>
              {theme === 'light' && <Badge tone="primary">Active</Badge>}
            </button>
            <button
              type="button"
              className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <span className="theme-preview dark">
                <span /><span /><span />
              </span>
              <span className="theme-label">
                <Moon size={16} /> Dark mode
              </span>
              {theme === 'dark' && <Badge tone="primary">Active</Badge>}
            </button>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h3><UserRound size={17} /> My profile</h3>
              <p>This information appears across the POS workspace.</p>
            </div>
          </div>
          <div className="profile-head">
            <Avatar name={user.name} color={user.color} size={52} />
            <div>
              <strong>{user.name}</strong>
              <small>@{user.username} · {ROLE_LABELS[user.role]}</small>
            </div>
            <Badge tone="violet">{ROLE_LABELS[user.role]}</Badge>
          </div>
          <form onSubmit={saveProfile} className="settings-form">
            <div className="form-grid">
              <label className="field">
                <span>Full name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Username</span>
                <input type="text" value={user.username} readOnly />
              </label>
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn btn-primary">Save changes</button>
            </div>
          </form>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h3><ShieldCheck size={17} /> Role &amp; responsibilities</h3>
              <p>Your access is tailored to your role in hotel and restaurant operations.</p>
            </div>
            <Badge tone="violet">{ROLE_LABELS[user.role]}</Badge>
          </div>
          <ul className="responsibility-list">
            {ROLE_RESPONSIBILITIES[user.role].map((line) => (
              <li key={line}>
                <CheckCircle2 size={15} />
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h3><Info size={17} /> Training workspace</h3>
              <p>About this educational build and how practice data is stored.</p>
            </div>
          </div>
          <div className="info-list">
            <div className="info-row"><span>Application</span><strong>{APP_NAME}</strong></div>
            <div className="info-row"><span>Build</span><strong>Hospitality learning tool · v1.0</strong></div>
            <div className="info-row"><span>Storage</span><strong>Browser localStorage</strong></div>
            <div className="info-row"><span>Backend</span><strong>Not connected</strong></div>
          </div>
          <div className="danger-zone">
            <div>
              <strong>Reset training data</strong>
              <p>Restore orders, rooms, inventory and users to their original state.</p>
            </div>
            {confirmReset ? (
              <div className="confirm-row">
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleReset}>
                  <RotateCcw size={16} /> Confirm reset
                </button>
              </div>
            ) : (
              <button type="button" className="btn btn-danger" onClick={() => setConfirmReset(true)}>
                <RotateCcw size={16} /> Reset training data
              </button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
