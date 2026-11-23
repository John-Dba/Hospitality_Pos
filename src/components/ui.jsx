import { useEffect } from 'react';
import { X } from 'lucide-react';
import { initials } from '../utils/format';

export function Avatar({ name, color = '#6366f1', size = 40 }) {
  return (
    <span
      className="avatar"
      style={{
        background: `linear-gradient(135deg, ${color}, ${color}aa)`,
        width: size,
        height: size,
        fontSize: size * 0.36,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

const STATUS_TONES = {
  pending: 'warning',
  awaiting_approval: 'warning',
  approved: 'info',
  issued: 'success',
  rejected: 'danger',
  fulfilled: 'success',
  preparing: 'info',
  ready: 'violet',
  completed: 'success',
  cancelled: 'danger',
  paid: 'success',
  unpaid: 'warning',
  free: 'success',
  occupied: 'danger',
  reserved: 'warning',
  clean: 'success',
  dirty: 'warning',
  cleaning: 'info',
  low: 'warning',
  out: 'danger',
  healthy: 'success',
  active: 'success',
  inactive: 'muted',
};

export function Badge({ children, tone = 'muted', dot = false }) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const label = String(status || '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
  return (
    <Badge tone={STATUS_TONES[status] || 'muted'} dot>
      {label}
    </Badge>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'primary' }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon tone-${tone}`}>
        <Icon size={20} />
      </div>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        {hint && <span className="stat-hint">{hint}</span>}
      </div>
    </div>
  );
}

export function ProgressBar({ value, tone = 'primary' }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className="progress">
      <span className={`progress-fill tone-${tone}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="empty-state">
      {Icon && (
        <span className="empty-icon">
          <Icon size={22} />
        </span>
      )}
      <strong>{title}</strong>
      {description && <p>{description}</p>}
    </div>
  );
}

export function Spinner({ size = 18 }) {
  return <span className="spinner" style={{ width: size, height: size }} />;
}
