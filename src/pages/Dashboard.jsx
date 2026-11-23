import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Banknote,
  ChefHat,
  ClipboardList,
  PackageSearch,
  Plus,
  TriangleAlert,
  Utensils,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/DataContext';
import {
  ROLE_LABELS,
  SALES_TREND,
} from '../data/constants';
import { formatCurrency, formatDate, formatTime } from '../utils/format';
import { canAccessInventoryCategory } from '../utils/inventoryAccess';
import {
  Badge,
  EmptyState,
  PageHeader,
  StatCard,
  StatusBadge,
} from '../components/ui';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export default function Dashboard() {
  const { user } = useAuth();
  const { orders, tables, inventory } = useAppData();

  const canOrder = ['waiter', 'manager', 'admin'].includes(user.role);
  const completed = orders.filter((order) => order.status === 'completed');
  const inProgress = orders.filter((order) =>
    ['pending', 'preparing', 'ready'].includes(order.status),
  );
  const occupiedTables = tables.filter((table) => table.status === 'occupied').length;
  const visibleInventory = inventory.filter((item) =>
    canAccessInventoryCategory(user.role, item.category),
  );
  const lowStock = visibleInventory.filter((item) => item.qty <= item.threshold);
  const outOfStock = visibleInventory.filter((item) => item.qty === 0);
  const kitchenQueue = orders
    .filter((order) => ['pending', 'preparing'].includes(order.status))
    .slice(0, 4);
  const todaySales = SALES_TREND[SALES_TREND.length - 1].value;
  const maxSale = Math.max(...SALES_TREND.map((day) => day.value));

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.name.split(' ')[0]}`}
        subtitle={`${formatDate(new Date())} · Signed in as ${ROLE_LABELS[user.role]}`}
        actions={
          canOrder && (
            <Link to="/orders" className="btn btn-primary">
              <Plus size={17} /> New order
            </Link>
          )
        }
      />

      <section className="stat-grid">
        <StatCard
          icon={Banknote}
          label="Today's sales"
          value={formatCurrency(todaySales)}
          hint="+12.4% vs yesterday"
          tone="primary"
        />
        <StatCard
          icon={ClipboardList}
          label="Orders today"
          value={orders.length}
          hint={`${inProgress.length} still in progress`}
          tone="info"
        />
        <StatCard
          icon={Utensils}
          label="Tables occupied"
          value={`${occupiedTables} / ${tables.length}`}
          hint={`${tables.filter((table) => table.status === 'free').length} tables available`}
          tone="violet"
        />
        <StatCard
          icon={PackageSearch}
          label="Low stock items"
          value={lowStock.length}
          hint={`${outOfStock.length} item${outOfStock.length === 1 ? '' : 's'} out of stock`}
          tone="warning"
        />
      </section>

      <section className="dash-grid">
        <div className="card chart-card">
          <div className="card-head">
            <div>
              <h3>Sales overview</h3>
              <p>Revenue for the last 7 days</p>
            </div>
            <Link to="/reports" className="link-btn">
              View reports <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="bar-chart">
            {SALES_TREND.map((day, index) => (
              <div className="bar-col" key={day.day}>
                <div className="bar-track">
                  <div
                    className={`bar-fill ${index === SALES_TREND.length - 1 ? 'current' : ''}`}
                    style={{ height: `${Math.round((day.value / maxSale) * 100)}%` }}
                    title={`${day.day}: ${formatCurrency(day.value)}`}
                  >
                    <span className="bar-tip">{formatCurrency(day.value)}</span>
                  </div>
                </div>
                <span className="bar-label">{day.day}</span>
              </div>
            ))}
          </div>
          <div className="chart-foot">
            <span>Weekly revenue</span>
            <strong>
              {formatCurrency(SALES_TREND.reduce((sum, day) => sum + day.value, 0))}
            </strong>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Kitchen queue</h3>
              <p>Orders awaiting preparation</p>
            </div>
            <Link to="/kitchen" className="link-btn">
              Open <ArrowUpRight size={15} />
            </Link>
          </div>
          {kitchenQueue.length === 0 ? (
            <EmptyState
              icon={ChefHat}
              title="Kitchen is clear"
              description="New orders will appear here."
            />
          ) : (
            <ul className="queue-list">
              {kitchenQueue.map((order) => (
                <li key={order.id}>
                  <div className="queue-icon">
                    <ChefHat size={17} />
                  </div>
                  <div className="queue-meta">
                    <strong>{order.id}</strong>
                    <small>
                      {order.tableName} · {order.items.reduce((sum, item) => sum + item.qty, 0)} items
                    </small>
                  </div>
                  <StatusBadge status={order.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="dash-grid">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Recent orders</h3>
              <p>Latest activity across hotel and restaurant operations</p>
            </div>
            <Link to="/orders" className="link-btn">
              All orders <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Table</th>
                  <th className="hide-sm">Waiter</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th className="hide-sm">Time</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.id}</strong></td>
                    <td>{order.tableName}</td>
                    <td className="hide-sm muted">{order.waiter}</td>
                    <td>{formatCurrency(order.total)}</td>
                    <td><StatusBadge status={order.status} /></td>
                    <td className="hide-sm muted">{formatTime(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Stock alerts</h3>
              <p>Items at or below reorder level</p>
            </div>
            <Link to="/inventory" className="link-btn">
              Inventory <ArrowUpRight size={15} />
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="Stock looks healthy"
              description="No items need restocking right now."
            />
          ) : (
            <ul className="alert-list">
              {lowStock.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <span className="alert-icon">
                    <TriangleAlert size={16} />
                  </span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>
                      {item.qty} {item.unit} left · reorder at {item.threshold}
                    </small>
                  </div>
                  <Badge tone={item.qty === 0 ? 'danger' : 'warning'}>
                    {item.qty === 0 ? 'Out' : 'Low'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <div className="mini-note">
            <strong>{completed.length}</strong> orders completed today
          </div>
        </div>
      </section>
    </>
  );
}
