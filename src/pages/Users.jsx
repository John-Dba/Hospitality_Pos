import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Search,
  ShieldCheck,
  UserPlus,
  Users as UsersIcon,
  UserX,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/DataContext';
import { ROLE_LABELS, ROLE_RESPONSIBILITIES } from '../data/constants';
import { Avatar, Badge, EmptyState, Modal, PageHeader } from '../components/ui';
import { formatCurrency } from '../utils/format';

const ROLE_TONES = {
  admin: 'violet',
  manager: 'info',
  waiter: 'warning',
  accountant: 'success',
  food_storekeeper: 'danger',
  beverage_storekeeper: 'info',
  bar_manager: 'violet',
  chef: 'primary',
  housekeeping: 'muted',
  receptionist: 'info',
};

const EMPTY_FORM = {
  name: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  role: 'waiter',
};

export default function Users() {
  const { user } = useAuth();
  const { users, orders, activity = [], addUser, toggleUserActive } = useAppData();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const roles = useMemo(() => Object.keys(ROLE_LABELS), []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter(
      (account) =>
        (roleFilter === 'all' || account.role === roleFilter) &&
        (!term ||
          account.name.toLowerCase().includes(term) ||
          account.username.toLowerCase().includes(term) ||
          account.email.toLowerCase().includes(term)),
    );
  }, [users, roleFilter, search]);

  const activeCount = users.filter((account) => account.active !== false).length;

  const openModal = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const updateField = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submitUser = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.username.trim() || !form.password) {
      setFormError('Name, username and password are required.');
      return;
    }
    const exists = users.some(
      (account) => account.username.toLowerCase() === form.username.trim().toLowerCase(),
    );
    if (exists) {
      setFormError('That username is already in use.');
      return;
    }
    addUser({
      name: form.name.trim(),
      username: form.username.trim(),
      email: form.email.trim() || `${form.username.trim()}@example.com`,
      phone: form.phone.trim(),
      password: form.password,
      role: form.role,
      color: '#6366f1',
    }, user.name);
    setModalOpen(false);
    setToast(`User ${form.name.trim()} created with ${ROLE_LABELS[form.role]} access.`);
  };

  const handleToggle = (account) => {
    if (account.id === user.id) return;
    toggleUserActive(account.id, user.name);
    setToast(
      `${account.name} ${account.active === false ? 'activated' : 'deactivated'} successfully.`,
    );
  };

  return (
    <>
      <PageHeader
        title="Team management"
        subtitle="Manage employee access and review work activity across every department."
        actions={
          <button type="button" className="btn btn-primary" onClick={openModal}>
            <UserPlus size={17} /> Add employee
          </button>
        }
      />

      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} /> {toast}
        </div>
      )}

      <div className="summary-grid">
        <div className="mini-stat">
          <span className="stat-icon tone-primary"><UsersIcon size={18} /></span>
          <div><strong>{users.length}</strong><small>Total employees</small></div>
        </div>
        <div className="mini-stat">
          <span className="stat-icon tone-success"><ShieldCheck size={18} /></span>
          <div><strong>{activeCount}</strong><small>Active accounts</small></div>
        </div>
        <div className="mini-stat">
          <span className="stat-icon tone-violet"><UserX size={18} /></span>
          <div><strong>{users.length - activeCount}</strong><small>Deactivated</small></div>
        </div>
        <div className="mini-stat">
          <span className="stat-icon tone-info"><UsersIcon size={18} /></span>
          <div><strong>{roles.length}</strong><small>Defined roles</small></div>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="chip-row">
            <button
              type="button"
              className={`chip ${roleFilter === 'all' ? 'active' : ''}`}
              onClick={() => setRoleFilter('all')}
            >
              All roles
            </button>
            {roles.map((role) => (
              <button
                key={role}
                type="button"
                className={`chip ${roleFilter === role ? 'active' : ''}`}
                onClick={() => setRoleFilter(role)}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
          <div className="input-wrap search-wrap">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search name, username or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No users found"
            description="Try another role or search term."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th className="hide-sm">Orders served</th>
                  <th className="hide-md">Sales value</th>
                  <th className="hide-sm">Work updates</th>
                  <th className="hide-md">Contact</th>
                  <th>Status</th>
                  <th className="align-right">Access</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((account) => {
                  const active = account.active !== false;
                  const employeeOrders = orders.filter((order) => order.waiter === account.name);
                  const salesValue = employeeOrders.reduce((sum, order) => sum + order.total, 0);
                  const workUpdates = activity.filter((entry) => entry.actor === account.name);
                  return (
                    <tr key={account.id}>
                      <td>
                        <div className="user-cell">
                          <Avatar name={account.name} color={account.color} size={38} />
                          <div>
                            <strong>
                              {account.name}
                              {account.id === user.id && <span className="you-tag">You</span>}
                            </strong>
                            <small>@{account.username}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge tone={ROLE_TONES[account.role] || 'muted'}>
                          {ROLE_LABELS[account.role]}
                        </Badge>
                      </td>
                      <td className="hide-sm"><strong>{employeeOrders.length}</strong><span className="cell-sub">customer orders</span></td>
                      <td className="hide-md"><strong>{formatCurrency(salesValue)}</strong><span className="cell-sub">order value</span></td>
                      <td className="hide-sm"><strong>{workUpdates.length}</strong><span className="cell-sub">recorded actions</span></td>
                      <td className="hide-md">
                        <div className="contact-cell">
                          <span>{account.email}</span>
                          <small>{account.phone || '—'}</small>
                        </div>
                      </td>
                      <td>
                        <Badge tone={active ? 'success' : 'muted'} dot>
                          {active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <div className="row-actions end">
                          <button
                            type="button"
                            className={`switch ${active ? 'on' : ''}`}
                            onClick={() => handleToggle(account)}
                            disabled={account.id === user.id}
                            aria-label={`${active ? 'Deactivate' : 'Activate'} ${account.name}`}
                            title={
                              account.id === user.id
                                ? 'You cannot deactivate your own account'
                                : active
                                  ? 'Deactivate account'
                                  : 'Activate account'
                            }
                          >
                            <span />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h3>Recent team activity</h3>
            <p>Work updates recorded by the POS, including orders, stock and room status.</p>
          </div>
          <Badge tone="info">{activity.length} records</Badge>
        </div>
        {activity.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No team activity yet" description="Actions will be recorded here as staff use the system." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Activity</th><th>Details</th><th>Time</th></tr></thead>
              <tbody>
                {activity.slice(0, 12).map((entry) => (
                  <tr key={entry.id}>
                    <td><strong>{entry.actor}</strong></td>
                    <td><Badge tone="muted">{entry.type.replace(/-/g, ' ')}</Badge></td>
                    <td>{entry.details}</td>
                    <td className="muted">{new Date(entry.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="card role-guide">
        <div className="card-head">
          <div>
            <h3>Role responsibilities</h3>
            <p>Example responsibilities for hotel and restaurant teams.</p>
          </div>
        </div>
        <div className="role-grid">
          {roles.map((role) => (
            <div className="role-card" key={role}>
              <Badge tone={ROLE_TONES[role] || 'muted'}>{ROLE_LABELS[role]}</Badge>
              <ul>
                {ROLE_RESPONSIBILITIES[role].slice(0, 3).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add system user"
        subtitle="Create a staff account and assign the right level of access."
      >
        <form onSubmit={submitUser} className="user-form">
          <div className="form-grid">
            <label className="field">
              <span>Full name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="e.g. Alice Mukamana"
                autoFocus
              />
            </label>
            <label className="field">
              <span>Username</span>
              <input
                type="text"
                value={form.username}
                onChange={(event) => updateField('username', event.target.value)}
                placeholder="e.g. alice"
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="name@example.com"
              />
            </label>
            <label className="field">
              <span>Phone</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="+250 7xx xxx xxx"
              />
            </label>
            <label className="field">
              <span>Temporary password</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                placeholder="Set a temporary password"
              />
            </label>
            <label className="field">
              <span>Role</span>
              <select
                value={form.role}
                onChange={(event) => updateField('role', event.target.value)}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="role-preview">
            <strong>{ROLE_LABELS[form.role]} permissions</strong>
            <ul>
              {ROLE_RESPONSIBILITIES[form.role].slice(0, 3).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          {formError && <div className="form-error">{formError}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <UserPlus size={16} /> Create user
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
