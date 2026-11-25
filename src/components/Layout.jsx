import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  Sun,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAppData } from '../context/DataContext';
import { APP_NAME, HOTEL_NAME, NAV_ITEMS, ROLE_LABELS } from '../data/constants';
import { canAccessInventoryCategory } from '../utils/inventoryAccess';
import { Avatar } from './ui';

const STOCK_ALERT_ROLES = ['admin', 'manager', 'accountant', 'food_storekeeper', 'beverage_storekeeper'];
const STOCK_OVERSIGHT_ROLES = ['admin', 'manager', 'accountant'];

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { orders, inventory, rooms } = useAppData();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  const navItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.roles.includes(user.role)),
    [user.role],
  );

  const current = NAV_ITEMS.find((item) => item.to === location.pathname);
  const pageTitle = current?.label || 'Dashboard';

  const alerts = useMemo(() => {
    const lowStock = STOCK_ALERT_ROLES.includes(user.role)
      ? inventory.filter((item) =>
          item.qty <= item.threshold &&
          (STOCK_OVERSIGHT_ROLES.includes(user.role) ||
            canAccessInventoryCategory(user.role, item.category)),
        )
      : [];
    const pending = orders.filter((order) => order.status === 'pending');
    const dirty = rooms.filter((room) => room.status === 'dirty');
    return [
      {
        id: 'orders',
        label: `${pending.length} order${pending.length === 1 ? '' : 's'} waiting in the kitchen queue`,
        to: '/kitchen',
        show: pending.length > 0,
      },
      ...lowStock.map((item) => ({
        id: `stock-${item.id}`,
        label: `Low stock: ${item.name} - ${item.qty} ${item.unit} left (reorder at ${item.threshold} ${item.unit})`,
        to: '/inventory',
        show: true,
      })),
      {
        id: 'rooms',
        label: `${dirty.length} room${dirty.length === 1 ? '' : 's'} need housekeeping attention`,
        to: '/housekeeping',
        show: dirty.length > 0,
      },
    ].filter((item) => item.show);
  }, [orders, inventory, rooms, user.role]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-logo">
            <UtensilsCrossed size={20} />
          </span>
          <div>
            <strong>{APP_NAME}</strong>
            <small>{HOTEL_NAME}</small>
          </div>
          <button
            type="button"
            className="icon-btn sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section">Workspace</span>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              <ChevronRight size={14} className="nav-arrow" />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <Avatar name={user.name} color={user.color} size={38} />
            <div className="sidebar-user-meta">
              <strong>{user.name}</strong>
              <small>{ROLE_LABELS[user.role]}</small>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
          <p className="sidebar-note">Hospitality training · Frontend only</p>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close menu overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-btn menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div>
              <h2>{pageTitle}</h2>
              <p>{HOTEL_NAME}</p>
            </div>
          </div>

          <div className="topbar-right">
            <span className="date-chip">
              <CalendarDays size={15} />
              {today}
            </span>

            <div className="notif-wrap">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setNotifOpen((open) => !open)}
                aria-label="Notifications"
                aria-expanded={notifOpen}
              >
                <Bell size={19} />
                {alerts.length > 0 && <span className="notif-dot" />}
              </button>
              {notifOpen && (
                <div className="notif-panel">
                  <div className="notif-head">
                    <strong>Notifications</strong>
                    <span>{alerts.length} active</span>
                  </div>
                  {alerts.length === 0 ? (
                    <p className="notif-empty">You are all caught up.</p>
                  ) : (
                    alerts.map((alert) => (
                      <button
                        key={alert.id}
                        type="button"
                        className="notif-item"
                        onClick={() => navigate(alert.to)}
                      >
                        <span className="notif-bullet" />
                        {alert.label}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="icon-btn"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            <Link to="/settings" className="user-chip" title="Open settings">
              <Avatar name={user.name} color={user.color} size={34} />
              <span>
                <strong>{user.name.split(' ')[0]}</strong>
                <small>{ROLE_LABELS[user.role]}</small>
              </span>
            </Link>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
