import {
  BellRing,
  ChefHat,
  CheckCircle2,
  Flame,
  Inbox,
  PackagePlus,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/DataContext';
import { formatTime, timeAgo } from '../utils/format';
import { EmptyState, Modal, PageHeader, StatusBadge } from '../components/ui';

const COLUMNS = [
  {
    key: 'pending',
    title: 'New orders',
    icon: Inbox,
    tone: 'warning',
    action: 'Start preparing',
    next: 'preparing',
  },
  {
    key: 'preparing',
    title: 'Preparing',
    icon: Flame,
    tone: 'info',
    action: 'Mark as ready',
    next: 'ready',
  },
  {
    key: 'ready',
    title: 'Ready to serve',
    icon: BellRing,
    tone: 'violet',
    action: 'Complete order',
    next: 'completed',
  },
];

export default function Kitchen() {
  const { user } = useAuth();
  const { orders, advanceOrder, inventory, createStockRequest, stockRequests = [] } = useAppData();
  const [requestOpen, setRequestOpen] = useState(false);
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [requestError, setRequestError] = useState('');
  const [toast, setToast] = useState('');

  const completedToday = orders.filter((order) => order.status === 'completed').length;
  const openRequests = stockRequests.filter((request) =>
    ['pending', 'awaiting_approval', 'approved'].includes(request.status),
  ).length;

  const submitRequest = (event) => {
    event.preventDefault();
    const amount = Number(quantity);
    if (!itemId || !Number.isInteger(amount) || amount <= 0) {
      setRequestError('Choose an item and enter a whole quantity greater than zero.');
      return;
    }
    createStockRequest({ itemId, quantity: amount, requestedBy: user.name, note: note.trim() });
    setRequestOpen(false);
    setItemId('');
    setQuantity('1');
    setNote('');
    setRequestError('');
    setToast('Supply request sent for accountant approval and stock issue.');
  };

  return (
    <>
      <PageHeader
        title="Kitchen board"
        subtitle="Live order tickets from the dining room to the pass."
        actions={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setRequestOpen(true)}>
              <PackagePlus size={16} /> Request supplies
              {openRequests > 0 && <span className="button-count">{openRequests}</span>}
            </button>
            <span className="live-pill"><span className="live-dot" /> Live</span>
          </>
        }
      />

      {toast && <div className="toast" role="status"><CheckCircle2 size={17} />{toast}</div>}

      <div className="kitchen-summary">
        {COLUMNS.map((column) => {
          const count = orders.filter((order) => order.status === column.key).length;
          return (
            <div className="mini-stat" key={column.key}>
              <span className={`stat-icon tone-${column.tone}`}>
                <column.icon size={18} />
              </span>
              <div>
                <strong>{count}</strong>
                <small>{column.title}</small>
              </div>
            </div>
          );
        })}
        <div className="mini-stat">
          <span className="stat-icon tone-success">
            <CheckCircle2 size={18} />
          </span>
          <div>
            <strong>{completedToday}</strong>
            <small>Completed today</small>
          </div>
        </div>
      </div>

      <div className="kanban">
        {COLUMNS.map((column) => {
          const tickets = orders.filter((order) => order.status === column.key);
          return (
            <section className="kanban-col" key={column.key}>
              <header className="kanban-head">
                <span className={`kanban-icon tone-${column.tone}`}>
                  <column.icon size={16} />
                </span>
                <strong>{column.title}</strong>
                <span className="kanban-count">{tickets.length}</span>
              </header>

              <div className="kanban-body">
                {tickets.length === 0 ? (
                  <EmptyState
                    icon={ChefHat}
                    title="No tickets"
                    description="Orders will show up here automatically."
                  />
                ) : (
                  tickets.map((order) => (
                    <article className="ticket" key={order.id}>
                      <div className="ticket-head">
                        <div>
                          <strong>{order.id}</strong>
                          <small>{order.tableName} · {order.waiter}</small>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>

                      <ul className="ticket-items">
                        {order.items.map((item) => (
                          <li key={item.id}>
                            <span className="ticket-qty">{item.qty}×</span>
                            {item.name}
                          </li>
                        ))}
                      </ul>

                      {order.note && (
                        <p className="ticket-note">Note: {order.note}</p>
                      )}

                      <div className="ticket-foot">
                        <span title={formatTime(order.createdAt)}>{timeAgo(order.createdAt)}</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => advanceOrder(order.id, column.next, user.name)}
                        >
                          {column.action}
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request supplies"
        subtitle="Send a supply request for approval. The matching food or beverage stockkeeper will issue approved items."
      >
        <form className="user-form" onSubmit={submitRequest}>
          <label className="field">
            <span>Ingredient or supply</span>
            <select value={itemId} onChange={(event) => setItemId(event.target.value)} autoFocus>
              <option value="">Select an inventory item</option>
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>{item.name} · {item.qty} {item.unit} available</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Quantity needed</span>
            <input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </label>
          <label className="field">
            <span>Note (optional)</span>
            <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Preparation or timing details" />
          </label>
          {requestError && <div className="form-error">{requestError}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setRequestOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary"><PackagePlus size={16} /> Send request</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
