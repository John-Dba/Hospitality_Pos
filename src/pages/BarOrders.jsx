import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Package, PackageX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/DataContext';
import { MENU_ITEMS } from '../data/constants';
import { formatTime } from '../utils/format';
import { EmptyState, PageHeader, StatusBadge } from '../components/ui';

function getOrderBeverages(order) {
  return order.items.filter((item) => item.category === 'Drinks');
}

function getStockLine(item, inventory) {
  const menuItem = MENU_ITEMS.find((entry) => entry.id === item.id);
  return inventory.find((entry) =>
    entry.id === menuItem?.inventoryItemId && entry.category === 'Beverages',
  );
}

export default function BarOrders() {
  const { user } = useAuth();
  const { orders, inventory, approveBeverageOrder } = useAppData();
  const [toast, setToast] = useState('');

  const beverageOrders = useMemo(
    () => orders.filter((order) => getOrderBeverages(order).length > 0),
    [orders],
  );
  const waitingOrders = beverageOrders.filter((order) => order.beverageStatus === 'pending');
  const approvedOrders = beverageOrders.filter((order) => order.beverageStatus === 'approved');

  const approveOrder = (order) => {
    const result = approveBeverageOrder(order.id, user.name, user.role);
    if (!result.success) {
      setToast(result.error);
      return;
    }
    setToast(`Beverage items for ${order.id} approved. Waiting for the storekeeper to issue stock.`);
  };

  return (
    <>
      <PageHeader
        title="Bar orders"
        subtitle="Review waiter beverage orders. Bar approval is separate from stock issue; the Beverage Storekeeper issues stock."
      />

      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} /> {toast}
        </div>
      )}

      <div className="summary-grid">
        <div className="mini-stat">
          <span className="stat-icon tone-warning"><ClipboardList size={18} /></span>
          <div><strong>{waitingOrders.length}</strong><small>Waiting for approval</small></div>
        </div>
        <div className="mini-stat">
          <span className="stat-icon tone-success"><CheckCircle2 size={18} /></span>
          <div><strong>{approvedOrders.length}</strong><small>Approved beverage orders</small></div>
        </div>
        <div className="mini-stat">
          <span className="stat-icon tone-info"><Package size={18} /></span>
          <div><strong>{inventory.filter((item) => item.category === 'Beverages').length}</strong><small>Beverage products tracked</small></div>
        </div>
        <div className="mini-stat">
          <span className="stat-icon tone-danger"><PackageX size={18} /></span>
          <div>
            <strong>{inventory.filter((item) => item.category === 'Beverages' && item.qty <= item.threshold).length}</strong>
            <small>Low beverage products</small>
          </div>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h3>Waiting for Bar Manager</h3>
            <p>Bar approval does not deduct stock; only the storekeeper can issue it.</p>
          </div>
          <span className="badge badge-warning">{waitingOrders.length} waiting</span>
        </div>
        {waitingOrders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No beverage orders waiting"
            description="New waiter orders containing drinks will appear here."
          />
        ) : (
          <div className="bar-order-list">
            {waitingOrders.map((order) => {
              const beverages = getOrderBeverages(order);
              const unavailable = beverages
                .map((item) => ({ item, stock: getStockLine(item, inventory) }))
                .find(({ item, stock }) => !stock || stock.qty < item.qty);
              const unavailableReason = !unavailable
                ? ''
                : !unavailable.stock
                  ? `Add a matching beverage product for ${unavailable.item.name} before approval.`
                  : `Not enough ${unavailable.stock.name}: ${unavailable.stock.qty} ${unavailable.stock.unit} available, ${unavailable.item.qty} required.`;

              return (
                <article className="card bar-order-card" key={order.id}>
                  <div className="bar-order-head">
                    <div>
                      <strong>{order.id} · {order.tableName}</strong>
                      <span className="cell-sub">Entered by {order.waiter} · {formatTime(order.createdAt)}</span>
                    </div>
                    <StatusBadge status="pending" />
                  </div>
                  <div className="bar-order-items">
                    {beverages.map((item) => {
                      const stock = getStockLine(item, inventory);
                      return (
                        <div className="bar-order-item" key={item.id}>
                          <span><strong>{item.qty} × {item.name}</strong></span>
                          <span className="muted">
                            {stock ? `${stock.qty} ${stock.unit} available` : 'No linked stock item'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {unavailableReason && (
                    <p className="form-error bar-stock-warning">{unavailableReason}</p>
                  )}
                  <div className="bar-order-actions">
                    <span className="muted">Bar approval sends the order to the Beverage Storekeeper.</span>
                    <button
                      type="button"
                      className="btn btn-primary"
                      title="Approve beverage order for storekeeper issue"
                      onClick={() => approveOrder(order)}
                    >
                      <CheckCircle2 size={16} /> Approve beverages
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h3>Approved beverages</h3>
            <p>Stock is deducted only after the Beverage Storekeeper issues these orders.</p>
          </div>
          <span className="badge badge-success">{approvedOrders.length} approved</span>
        </div>
        {approvedOrders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No approved beverage orders yet"
            description="Completed beverage approvals will be listed here."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Order</th><th>Table</th><th>Beverages</th><th>Waiter</th><th>Approved by</th><th>Approved at</th></tr>
              </thead>
              <tbody>
                {approvedOrders.slice(0, 10).map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.id}</strong></td>
                    <td>{order.tableName}</td>
                    <td>{getOrderBeverages(order).map((item) => `${item.qty} × ${item.name}`).join(', ')}</td>
                    <td>{order.waiter}</td>
                    <td>{order.beverageApprovedBy || 'Previously completed'}</td>
                    <td className="muted">{order.beverageApprovedAt ? formatTime(order.beverageApprovedAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
