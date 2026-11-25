import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Eye,
  Minus,
  Printer,
  Plus,
  Search,
  Send,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/DataContext';
import { RECEIPT_PAYMENT_DETAILS } from '../data/constants';
import { formatCurrency, formatTime } from '../utils/format';
import {
  Badge,
  EmptyState,
  Modal,
  PageHeader,
  StatusBadge,
} from '../components/ui';

const STATUS_TABS = ['all', 'pending', 'preparing', 'ready', 'completed'];
const NEXT_STATUS = {
  pending: { value: 'preparing', label: 'Start preparing' },
  preparing: { value: 'ready', label: 'Mark ready' },
  ready: { value: 'completed', label: 'Complete order' },
};
export default function Orders() {
  const { user } = useAuth();
  const { orders, tables, menuItems, addOrder, advanceOrder, setOrderPayment } = useAppData();

  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [printReceiptOrder, setPrintReceiptOrder] = useState(null);
  const [printedAt, setPrintedAt] = useState(null);
  const [toast, setToast] = useState('');

  const [cart, setCart] = useState({});
  const [tableId, setTableId] = useState('');
  const [note, setNote] = useState('');
  const [menuCategory, setMenuCategory] = useState('All');
  const [menuSearch, setMenuSearch] = useState('');
  const [formError, setFormError] = useState('');

  const canCreate = ['waiter', 'manager', 'admin'].includes(user.role);
  const canAdvance = ['manager', 'admin'].includes(user.role);
  const canPrintReceipt = ['waiter', 'manager', 'admin'].includes(user.role);
  const canPay = user.role === 'accountant';
  const canPrintOrderReceipt = (order) =>
    canPrintReceipt && (user.role !== 'waiter' || order.waiter === user.name);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!printReceiptOrder) return undefined;
    const clearPrintedReceipt = () => setPrintReceiptOrder(null);
    window.addEventListener('afterprint', clearPrintedReceipt, { once: true });
    window.print();
    return () => window.removeEventListener('afterprint', clearPrintedReceipt);
  }, [printReceiptOrder]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesSearch =
        !term ||
        order.id.toLowerCase().includes(term) ||
        order.tableName.toLowerCase().includes(term) ||
        order.waiter.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, search]);

  const cartItems = useMemo(
    () =>
      menuItems.filter((item) => cart[item.id]).map((item) => ({
        ...item,
        qty: cart[item.id],
      })),
    [cart, menuItems],
  );
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

  const menuFiltered = useMemo(() => {
    const term = menuSearch.trim().toLowerCase();
    return menuItems.filter(
      (item) =>
        (menuCategory === 'All' || item.category === menuCategory) &&
        (!term || item.name.toLowerCase().includes(term)),
    );
  }, [menuCategory, menuSearch, menuItems]);

  const counts = useMemo(() => {
    const base = { all: orders.length };
    STATUS_TABS.slice(1).forEach((status) => {
      base[status] = orders.filter((order) => order.status === status).length;
    });
    return base;
  }, [orders]);
  const currentDetail = detail
    ? orders.find((order) => order.id === detail.id) || detail
    : null;

  const openNewOrder = () => {
    setCart({});
    setTableId('');
    setNote('');
    setFormError('');
    setMenuCategory('All');
    setMenuSearch('');
    setNewOpen(true);
  };

  const changeQty = (id, delta) => {
    setCart((current) => {
      const next = Math.max(0, (current[id] || 0) + delta);
      const copy = { ...current };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  };

  const submitOrder = (event) => {
    event.preventDefault();
    if (!tableId) {
      setFormError('Please select a table for this order.');
      return;
    }
    if (cartItems.length === 0) {
      setFormError('Add at least one menu item to the order.');
      return;
    }
    const table = tables.find((entry) => entry.id === tableId);
    addOrder({
      tableId,
      tableName: table?.name || tableId,
      waiter: user.name,
      items: cartItems.map(({ id, name, price, qty }) => ({ id, name, price, qty })),
      total: cartTotal,
      note: note.trim(),
    });
    setNewOpen(false);
    const hasFood = cartItems.some((item) => item.category === 'Food');
    const hasBeverages = cartItems.some((item) => item.category === 'Drinks');
    const messages = [];
    if (hasFood && hasBeverages) {
      messages.push('Food sent to the kitchen; beverages, including juice, sent to the Bar Manager.');
    } else if (hasBeverages) {
      messages.push('Beverages, including juice, sent to the Bar Manager.');
    } else if (hasFood) {
      messages.push(`Food order sent to the kitchen for ${table?.name || tableId}.`);
    }
    setToast(messages.join(' '));
  };

  const advance = (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    advanceOrder(order.id, next.value, user.name);
    setToast(`${order.id} moved to ${next.value}.`);
  };

  const markPaid = (order) => {
    const result = setOrderPayment(order.id, 'paid', user.name);
    if (!result.success) {
      setToast(result.error);
      return;
    }
    setToast(`Payment recorded for ${order.id}.`);
  };

  const printReceipt = (order) => {
    const currentOrder = orders.find((entry) => entry.id === order.id);
    if (!currentOrder) {
      setToast('This order is no longer available.');
      return;
    }
    if (!canPrintOrderReceipt(currentOrder)) {
      setToast('You can only print receipts for orders you created.');
      return;
    }
    setPrintedAt(new Date());
    setPrintReceiptOrder(currentOrder);
  };

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Create orders, track preparation and record payments."
        actions={
          canCreate && (
            <button type="button" className="btn btn-primary" onClick={openNewOrder}>
              <Plus size={17} /> New order
            </button>
          )
        }
      />

      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} /> {toast}
        </div>
      )}

      <div className="card">
        <div className="toolbar">
          <div className="tabs">
            {STATUS_TABS.map((status) => (
              <button
                key={status}
                type="button"
                className={`tab ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'All orders' : status.replace(/^\w/, (c) => c.toUpperCase())}
                <span className="tab-count">{counts[status] || 0}</span>
              </button>
            ))}
          </div>
          <div className="input-wrap search-wrap">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search order, table or waiter"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No orders found"
            description="Try a different filter or create a new order."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Table</th>
                  <th className="hide-sm">Items</th>
                  <th>Total</th>
                  <th>Waiter</th>
                  <th>Status</th>
                  <th className="hide-md">Payment</th>
                  <th className="hide-sm">Time</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const next = NEXT_STATUS[order.status];
                  return (
                    <tr key={order.id}>
                      <td><strong>{order.id}</strong></td>
                      <td>{order.tableName}</td>
                      <td className="hide-sm muted">
                        {order.items.reduce((sum, item) => sum + item.qty, 0)} items
                      </td>
                      <td><strong>{formatCurrency(order.total)}</strong></td>
                      <td className="muted">{order.waiter}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td className="hide-md"><StatusBadge status={order.payment} /></td>
                      <td className="hide-sm muted">{formatTime(order.createdAt)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            title="View order"
                            onClick={() => setDetail(order)}
                          >
                            <Eye size={16} />
                          </button>
                          {canPrintOrderReceipt(order) && (
                            <button
                              type="button"
                              className="icon-btn"
                              title={order.payment === 'paid' ? 'Reprint paid receipt' : 'Print customer receipt'}
                              aria-label={`Print receipt for ${order.id}`}
                              onClick={() => printReceipt(order)}
                            >
                              <Printer size={16} />
                            </button>
                          )}
                          {canAdvance && next && (
                            <button
                              type="button"
                              className="icon-btn icon-btn-primary"
                              title={next.label}
                              onClick={() => advance(order)}
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                          {canPay && order.status === 'completed' && order.payment === 'unpaid' && (
                            <button
                              type="button"
                              className="icon-btn icon-btn-success"
                              title="Mark as paid"
                              onClick={() => markPaid(order)}
                            >
                              <CreditCard size={16} />
                            </button>
                          )}
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

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="Create new order"
        subtitle="Select a table, add menu items and send each item to its preparation area."
        size="xl"
      >
        <form onSubmit={submitOrder} className="order-form">
          <div className="order-menu">
            <div className="menu-controls">
              <div className="input-wrap search-wrap">
                <Search size={16} />
                <input
                  type="search"
                  placeholder="Search menu"
                  value={menuSearch}
                  onChange={(event) => setMenuSearch(event.target.value)}
                />
              </div>
              <div className="chip-row">
                {['All', 'Food', 'Drinks'].map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`chip ${menuCategory === category ? 'active' : ''}`}
                    onClick={() => setMenuCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="menu-grid">
              {menuFiltered.map((item) => (
                <div key={item.id} className="menu-item">
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.id.toUpperCase()} · {item.category} · {formatCurrency(item.price)}</small>
                  </div>
                  {cart[item.id] ? (
                    <div className="stepper">
                      <button type="button" onClick={() => changeQty(item.id, -1)} aria-label="Remove one">
                        <Minus size={13} />
                      </button>
                      <span>{cart[item.id]}</span>
                      <button type="button" onClick={() => changeQty(item.id, 1)} aria-label="Add one">
                        <Plus size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="icon-btn icon-btn-primary"
                      onClick={() => changeQty(item.id, 1)}
                      aria-label={`Add ${item.name}`}
                    >
                      <Plus size={15} />
                    </button>
                  )}
                </div>
              ))}
              {menuFiltered.length === 0 && (
                <p className="muted menu-empty">No menu items match your search.</p>
              )}
            </div>
          </div>

          <div className="order-cart">
            <label className="field">
              <span>Table / room</span>
              <select value={tableId} onChange={(event) => setTableId(event.target.value)}>
                <option value="">Select a table</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    #{table.name.replace(/\D/g, '')} · {table.area} · {table.status}
                  </option>
                ))}
              </select>
            </label>

            <div className="cart-head">
              <span><ShoppingCart size={15} /> Order summary</span>
              <Badge tone="violet">{cartCount} items</Badge>
            </div>

            {cartItems.length === 0 ? (
              <p className="cart-empty">No items yet. Choose dishes and drinks from the menu.</p>
            ) : (
              <ul className="cart-list">
                {cartItems.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{formatCurrency(item.price)} each</small>
                    </div>
                    <div className="cart-item-right">
                      <div className="stepper">
                        <button type="button" onClick={() => changeQty(item.id, -1)} aria-label="Decrease">
                          <Minus size={13} />
                        </button>
                        <span>{item.qty}</span>
                        <button type="button" onClick={() => changeQty(item.id, 1)} aria-label="Increase">
                          <Plus size={13} />
                        </button>
                      </div>
                      <strong>{formatCurrency(item.price * item.qty)}</strong>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => setCart((current) => {
                          const copy = { ...current };
                          delete copy[item.id];
                          return copy;
                        })}
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <label className="field">
              <span>Special requests</span>
              <textarea
                rows={2}
                placeholder="Allergies, cooking preferences, notes for the kitchen…"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>

            {formError && <div className="form-error">{formError}</div>}

            <div className="cart-total">
              <span>Total</span>
              <strong>{formatCurrency(cartTotal)}</strong>
            </div>

            <button type="submit" className="btn btn-primary btn-block">
              <Send size={16} /> Send order
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(currentDetail)}
        onClose={() => setDetail(null)}
        title={currentDetail ? `Order ${currentDetail.id}` : 'Order'}
        subtitle={currentDetail ? `${currentDetail.tableName} · ${currentDetail.waiter}` : ''}
      >
        {currentDetail && (
          <div className="detail">
            <div className="detail-row">
              <span>Status</span>
              <StatusBadge status={currentDetail.status} />
            </div>
            <div className="detail-row">
              <span>Payment</span>
              <StatusBadge status={currentDetail.payment} />
            </div>
            <div className="detail-row">
              <span>Placed at</span>
              <strong>{formatTime(currentDetail.createdAt)}</strong>
            </div>
            <ul className="cart-list">
              {currentDetail.items.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.qty} × {formatCurrency(item.price)}</small>
                  </div>
                  <strong>{formatCurrency(item.qty * item.price)}</strong>
                </li>
              ))}
            </ul>
            {currentDetail.note && (
              <div className="detail-note">
                <strong>Note</strong>
                <p>{currentDetail.note}</p>
              </div>
            )}
            <div className="cart-total">
              <span>Total</span>
              <strong>{formatCurrency(currentDetail.total)}</strong>
            </div>
            {canPrintOrderReceipt(currentDetail) && (
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => printReceipt(currentDetail)}
              >
                <Printer size={16} />
                {currentDetail.payment === 'paid' ? 'Reprint paid receipt' : 'Print customer receipt'}
              </button>
            )}
          </div>
        )}
      </Modal>
      {printReceiptOrder && (
        <article className="print-receipt" aria-label={`Receipt for ${printReceiptOrder.id}`}>
          <header className="receipt-header">
            <strong>Hospitality POS</strong>
            <span>Restaurant &amp; Hotel Operations</span>
            <span>Customer receipt</span>
          </header>
          <div className="receipt-meta">
            <div><span>Order</span><strong>{printReceiptOrder.id}</strong></div>
            <div><span>Table</span><strong>{printReceiptOrder.tableName}</strong></div>
            <div><span>Waiter</span><strong>{printReceiptOrder.waiter}</strong></div>
            <div><span>Order date</span><strong>{new Date(printReceiptOrder.createdAt).toLocaleDateString()}</strong></div>
            <div><span>Order time</span><strong>{new Date(printReceiptOrder.createdAt).toLocaleTimeString()}</strong></div>
            {printedAt && <div><span>Printed at</span><strong>{printedAt.toLocaleString()}</strong></div>}
            <div><span>Payment status</span><strong>{String(printReceiptOrder.payment).toUpperCase()}</strong></div>
          </div>
          <div className="receipt-items">
            {printReceiptOrder.items.map((item) => (
              <div className="receipt-item" key={item.id}>
                <span>{item.name}<small>{item.qty} × {formatCurrency(item.price)}</small></span>
                <strong>{formatCurrency(item.qty * item.price)}</strong>
              </div>
            ))}
          </div>
          <div className="receipt-total">
          <span>{printReceiptOrder.payment === 'paid' ? 'Total paid' : 'Total due'}</span>
          <strong>{formatCurrency(printReceiptOrder.total)}</strong>
          </div>
          {printReceiptOrder.payment !== 'paid' && (
            <div className="receipt-payment">
              <strong>Payment options</strong>
              <div><span>MoMo</span><b>{RECEIPT_PAYMENT_DETAILS.mobileMoneyNumber}</b></div>
              <div><span>MoMo Code</span><b>{RECEIPT_PAYMENT_DETAILS.mobileMoneyCode}</b></div>
              <div><span>Equity Bank</span><b>{RECEIPT_PAYMENT_DETAILS.equityBankAccount}</b></div>
            </div>
          )}
          <footer>
            {printReceiptOrder.payment === 'paid'
              ? 'Thank you for dining with us. We look forward to welcoming you again!'
              : 'Thank you for dining with us.'}
          </footer>
        </article>
      )}
    </>
  );
}
