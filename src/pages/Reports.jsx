import { useMemo, useState } from 'react';
import {
  Banknote,
  BarChart3,
  CreditCard,
  Download,
  ReceiptText,
  TrendingUp,
} from 'lucide-react';
import { useAppData } from '../context/DataContext';
import { PAYMENT_BREAKDOWN, SALES_TREND } from '../data/constants';
import { downloadCsv, formatCurrency, formatDate, formatNumber } from '../utils/format';
import { EmptyState, PageHeader, ProgressBar, StatCard } from '../components/ui';

const buildMonthData = () =>
  Array.from({ length: 30 }, (_, index) => ({
    day: String(index + 1),
    value: 118000 + ((index * 37) % 90) * 1000 + (index % 7 === 5 ? 62000 : 0),
  }));

export default function Reports() {
  const { orders } = useAppData();
  const [range, setRange] = useState(7);

  const monthData = useMemo(buildMonthData, []);
  const data = range === 7 ? SALES_TREND : monthData;
  const maxValue = Math.max(...data.map((entry) => entry.value));
  const revenue = data.reduce((sum, entry) => sum + entry.value, 0);

  const completed = orders.filter((order) => order.status === 'completed');
  const paidTotal = orders
    .filter((order) => order.payment === 'paid')
    .reduce((sum, order) => sum + order.total, 0);
  const averageOrder = completed.length
    ? Math.round(completed.reduce((sum, order) => sum + order.total, 0) / completed.length)
    : 0;

  const topItems = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const current = map.get(item.name) || { name: item.name, qty: 0, revenue: 0 };
        current.qty += item.qty;
        current.revenue += item.qty * item.price;
        map.set(item.name, current);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [orders]);

  const exportOrders = () => {
    const rows = [
      ['Order', 'Table', 'Waiter', 'Status', 'Payment', 'Total (RWF)', 'Date'],
      ...orders.map((order) => [
        order.id,
        order.tableName,
        order.waiter,
        order.status,
        order.payment,
        order.total,
        new Date(order.createdAt).toLocaleString('en-US'),
      ]),
    ];
    downloadCsv(`hospitality-pos-orders-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`Sales and payment performance · ${formatDate(new Date())}`}
        actions={
          <>
            <div className="segmented">
              <button
                type="button"
                className={range === 7 ? 'active' : ''}
                onClick={() => setRange(7)}
              >
                Last 7 days
              </button>
              <button
                type="button"
                className={range === 30 ? 'active' : ''}
                onClick={() => setRange(30)}
              >
                Last 30 days
              </button>
            </div>
            <button type="button" className="btn btn-primary" onClick={exportOrders}>
              <Download size={16} /> Export CSV
            </button>
          </>
        }
      />

      <section className="stat-grid">
        <StatCard
          icon={Banknote}
          label="Total revenue"
          value={formatCurrency(revenue)}
          hint={`${range}-day period`}
          tone="primary"
        />
        <StatCard
          icon={ReceiptText}
          label="Completed orders"
          value={completed.length}
          hint="Served and closed"
          tone="success"
        />
        <StatCard
          icon={TrendingUp}
          label="Average order"
          value={formatCurrency(averageOrder)}
          hint="Across completed orders"
          tone="info"
        />
        <StatCard
          icon={CreditCard}
          label="Payments collected"
          value={formatCurrency(paidTotal)}
          hint="Marked as paid"
          tone="violet"
        />
      </section>

      <section className="dash-grid">
        <div className="card chart-card">
          <div className="card-head">
            <div>
              <h3>Revenue trend</h3>
              <p>{range === 7 ? 'Daily revenue for this week' : 'Daily revenue for the last 30 days'}</p>
            </div>
            <span className="badge badge-primary">
              <BarChart3 size={14} /> {formatCurrency(revenue)}
            </span>
          </div>
          <div className="bar-chart">
            {data.map((entry, index) => (
              <div className="bar-col" key={`${entry.day}-${index}`}>
                <div className="bar-track">
                  <div
                    className={`bar-fill ${index === data.length - 1 ? 'current' : ''}`}
                    style={{ height: `${Math.round((entry.value / maxValue) * 100)}%` }}
                    title={`${entry.day}: ${formatCurrency(entry.value)}`}
                  >
                    <span className="bar-tip">{formatCurrency(entry.value)}</span>
                  </div>
                </div>
                <span className="bar-label">
                  {range === 7 || index % 5 === 0 ? entry.day : ''}
                </span>
              </div>
            ))}
          </div>
          <div className="chart-foot">
            <span>Period total</span>
            <strong>{formatCurrency(revenue)}</strong>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Payment methods</h3>
              <p>Share of collected revenue</p>
            </div>
          </div>
          <ul className="payment-list">
            {PAYMENT_BREAKDOWN.map((entry) => (
              <li key={entry.method}>
                <div className="payment-top">
                  <span>
                    <span className="legend-dot" style={{ background: entry.color }} />
                    {entry.method}
                  </span>
                  <strong>{entry.value}%</strong>
                </div>
                <ProgressBar value={entry.value} tone="primary" />
                <small>{formatCurrency(Math.round((revenue * entry.value) / 100))}</small>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h3>Top selling items</h3>
            <p>Ranked by quantity sold across current orders</p>
          </div>
        </div>
        {topItems.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No sales data yet"
            description="Top sellers appear once orders are created."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Quantity sold</th>
                  <th>Revenue</th>
                  <th className="hide-sm">Share</th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((item, index) => {
                  const share = Math.round((item.qty / topItems[0].qty) * 100);
                  return (
                    <tr key={item.name}>
                      <td><span className="rank">{index + 1}</span></td>
                      <td><strong>{item.name}</strong></td>
                      <td>{formatNumber(item.qty)}</td>
                      <td><strong>{formatCurrency(item.revenue)}</strong></td>
                      <td className="hide-sm">
                        <div className="stock-cell">
                          <ProgressBar value={share} tone="violet" />
                          <span>{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
