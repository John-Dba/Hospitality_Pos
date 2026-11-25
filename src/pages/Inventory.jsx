import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Package,
  PackagePlus,
  PackageX,
  Plus,
  Search,
  TriangleAlert,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/DataContext';
import { formatNumber } from '../utils/format';
import {
  canAccessInventoryCategory,
  canManageInventoryCategory,
  getInventoryCategoriesForRole,
} from '../utils/inventoryAccess';
import {
  Badge,
  EmptyState,
  Modal,
  PageHeader,
  ProgressBar,
  StatusBadge,
} from '../components/ui';

const statusOf = (item) => {
  if (item.qty === 0) return 'out';
  if (item.qty <= item.threshold) return 'low';
  return 'healthy';
};

export default function Inventory() {
  const { user } = useAuth();
  const {
    inventory,
    inventoryMovements = [],
    stockRequests = [],
    orders = [],
    menuItems,
    addInventoryItem,
    restockItem,
    issueItem,
    approveStockRequest,
    rejectStockRequest,
    fulfillStockRequest,
    fulfillBeverageOrder,
  } = useAppData();
  const canManageStock = ['admin', 'manager', 'food_storekeeper', 'beverage_storekeeper'].includes(user.role);
  const canReviewRequests = user.role === 'accountant';
  const canIssueRequests = ['admin', 'manager', 'food_storekeeper', 'beverage_storekeeper'].includes(user.role);
  const productCategories = getInventoryCategoriesForRole(user.role);
  const pageTitle = user.role === 'food_storekeeper'
    ? 'Food inventory'
    : user.role === 'beverage_storekeeper'
      ? 'Beverage inventory'
      : 'Inventory';
  const pageSubtitle = user.role === 'food_storekeeper'
    ? 'Manage food supplies, produce, meat and fish stock.'
    : user.role === 'beverage_storekeeper'
      ? 'Manage beverages, including soft drinks, beer and bar stock.'
      : canReviewRequests
        ? 'Review and approve kitchen supply requests before stock is issued.'
        : 'Track stock received from suppliers and issue approved kitchen requests.';
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [restocking, setRestocking] = useState(null);
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: productCategories[0],
    unit: '',
    qty: '0',
    threshold: '0',
  });
  const [productError, setProductError] = useState('');
  const [movementType, setMovementType] = useState('in');
  const [quantity, setQuantity] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const visibleInventory = useMemo(
    () => inventory.filter((item) => canAccessInventoryCategory(user.role, item.category)),
    [inventory, user.role],
  );

  const visibleRequests = useMemo(
    () => stockRequests.filter((request) => {
      const item = inventory.find((entry) => entry.id === request.itemId);
      return item && canAccessInventoryCategory(user.role, item.category);
    }),
    [stockRequests, inventory, user.role],
  );

  const visibleMovements = useMemo(
    () => inventoryMovements.filter((movement) => {
      const item = inventory.find((entry) => entry.id === movement.itemId);
      return canAccessInventoryCategory(user.role, movement.category || item?.category);
    }),
    [inventoryMovements, inventory, user.role],
  );

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(visibleInventory.map((item) => item.category)))],
    [visibleInventory],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return visibleInventory.filter(
      (item) =>
        (category === 'All' || item.category === category) &&
        (!term || item.name.toLowerCase().includes(term)),
    );
  }, [visibleInventory, category, search]);

  const stats = useMemo(() => {
    const low = visibleInventory.filter((item) => statusOf(item) === 'low').length;
    const out = visibleInventory.filter((item) => statusOf(item) === 'out').length;
    return {
      total: visibleInventory.length,
      healthy: visibleInventory.length - low - out,
      low,
      out,
    };
  }, [visibleInventory]);

  const openMovement = (item, direction) => {
    setRestocking(item);
    setMovementType(direction);
    setQuantity(direction === 'in' ? String(Math.max(item.threshold * 2 - item.qty, 10)) : '');
  };

  const submitRestock = (event) => {
    event.preventDefault();
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) {
      setToast('Enter a quantity greater than zero.');
      return;
    }
    if (movementType === 'out' && amount > restocking.qty) {
      setToast(`Only ${restocking.qty} ${restocking.unit} of ${restocking.name} is available.`);
      return;
    }
    if (movementType === 'in') restockItem(restocking.id, amount, user.name, user.role);
    else issueItem(restocking.id, amount, user.name, 'Manual stock issue', user.role);
    setToast(`${movementType === 'in' ? 'Received' : 'Issued'} ${amount} ${restocking.unit} of ${restocking.name}.`);
    setRestocking(null);
  };

  const openAddProduct = () => {
    setNewProduct({
      name: '',
      category: productCategories[0],
      unit: '',
      qty: '0',
      threshold: '0',
    });
    setProductError('');
    setAddingProduct(true);
  };

  const submitNewProduct = (event) => {
    event.preventDefault();
    const result = addInventoryItem({
      ...newProduct,
      qty: Number(newProduct.qty),
      threshold: Number(newProduct.threshold),
    }, user.name, user.role);
    if (!result.success) {
      setProductError(result.error);
      return;
    }
    setAddingProduct(false);
    setToast(`${newProduct.name.trim()} added to ${newProduct.category}.`);
  };

  const requestsAwaitingApproval = visibleRequests.filter((request) =>
    ['pending', 'awaiting_approval'].includes(request.status),
  );
  const approvedRequests = visibleRequests.filter((request) => request.status === 'approved');
  const canIssueBeverageStock = ['admin', 'manager', 'beverage_storekeeper'].includes(user.role);
  const beverageOrders = canIssueBeverageStock
    ? orders.filter((order) =>
        order.items?.some((item) => item.category === 'Drinks') &&
        ['approved', 'issued'].includes(order.beverageStatus),
      )
    : [];

  const getBeverageStockLine = (orderItem) => {
    const menuItem = menuItems.find((item) => item.id === orderItem.id);
    return inventory.find(
      (item) => item.id === menuItem?.inventoryItemId && item.category === 'Beverages',
    );
  };

  const issueBeverageOrder = (order) => {
    const result = fulfillBeverageOrder(order.id, user.name, user.role);
    setToast(result.success
      ? `Beverage stock issued for ${order.id}.`
      : result.error);
  };

  return (
    <>
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
          <>
            {canManageStock && (
              <button type="button" className="btn btn-primary" onClick={openAddProduct}>
                <Plus size={16} /> Add product
              </button>
            )}
            <span className="badge badge-violet">
              <Package size={14} /> {stats.total} items tracked
            </span>
          </>
        }
      />

      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} /> {toast}
        </div>
      )}

      <div className="summary-grid">
        <div className="mini-stat">
          <span className="stat-icon tone-primary"><Package size={18} /></span>
          <div><strong>{stats.total}</strong><small>Total items</small></div>
        </div>
        <div className="mini-stat">
          <span className="stat-icon tone-success"><CheckCircle2 size={18} /></span>
          <div><strong>{stats.healthy}</strong><small>Healthy stock</small></div>
        </div>
        <div className="mini-stat">
          <span className="stat-icon tone-warning"><TriangleAlert size={18} /></span>
          <div><strong>{stats.low}</strong><small>Low stock</small></div>
        </div>
        <div className="mini-stat">
          <span className="stat-icon tone-danger"><PackageX size={18} /></span>
          <div><strong>{stats.out}</strong><small>Out of stock</small></div>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="chip-row">
            {categories.map((entry) => (
              <button
                key={entry}
                type="button"
                className={`chip ${category === entry ? 'active' : ''}`}
                onClick={() => setCategory(entry)}
              >
                {entry}
              </button>
            ))}
          </div>
          <div className="input-wrap search-wrap">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search stock items"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No stock items found"
            description="Adjust the category or search term."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="hide-sm">Category</th>
                  <th>Stock level</th>
                  <th className="hide-sm">Reorder at</th>
                  <th>Status</th>
                  <th className="align-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const status = statusOf(item);
                  const percent = Math.min(
                    100,
                    Math.round((item.qty / Math.max(item.threshold * 2, 1)) * 100),
                  );
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <span className="cell-sub">
                          {formatNumber(item.qty)} {item.unit} in stock
                        </span>
                      </td>
                      <td className="hide-sm muted">{item.category}</td>
                      <td>
                        <div className="stock-cell">
                          <ProgressBar
                            value={percent}
                            tone={status === 'out' ? 'danger' : status === 'low' ? 'warning' : 'success'}
                          />
                          <span>{percent}%</span>
                        </div>
                      </td>
                      <td className="hide-sm muted">
                        {item.threshold} {item.unit}
                      </td>
                      <td><StatusBadge status={status} /></td>
                      <td>
                        <div className="row-actions">
                          {canManageStock && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                onClick={() => openMovement(item, 'in')}
                              >
                                <PackagePlus size={15} /> Restock
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                onClick={() => openMovement(item, 'out')}
                                disabled={item.qty <= 0}
                              >
                                <TrendingDown size={15} /> Issue
                              </button>
                            </>
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

      <section className="card">
        <div className="card-head">
          <div>
            <h3>Kitchen requests</h3>
            <p>
              {canReviewRequests
                ? 'Approve requests before the matching stockkeeper can deduct stock.'
                : canIssueRequests
                  ? 'Confirm approved requests; stock is deducted only after storekeeper issue approval.'
                  : 'Track approval and issue status for kitchen requests.'}
            </p>
          </div>
          <span className="badge badge-warning">
            <ClipboardList size={14} /> {canReviewRequests
              ? `${requestsAwaitingApproval.length} to approve`
              : `${approvedRequests.length} approved to issue`}
          </span>
        </div>
        {visibleRequests.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No kitchen requests" description="New requests from the kitchen will appear here." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Requested item</th><th>Quantity</th><th>Requested by</th><th>Status</th><th>Note</th><th className="align-right">Action</th></tr>
              </thead>
              <tbody>
                {visibleRequests.map((request) => {
                  const available = inventory.find((item) => item.id === request.itemId)?.qty || 0;
                  const requestItem = inventory.find((item) => item.id === request.itemId);
                  const canFulfill = available >= request.quantity &&
                    canManageInventoryCategory(user.role, requestItem?.category);
                  return (
                    <tr key={request.id}>
                      <td>
                        <strong>{request.itemName}</strong>
                        <span className="cell-sub">{request.category || requestItem?.category}</span>
                        <span className="cell-sub">{request.id}</span>
                      </td>
                      <td>{request.quantity} {request.unit}<span className="cell-sub">{available} {request.unit} available</span></td>
                      <td>{request.requestedBy}</td>
                      <td><StatusBadge status={request.status} /></td>
                      <td className="muted">{request.note || '—'}</td>
                      <td><div className="row-actions">
                        {canReviewRequests && ['pending', 'awaiting_approval'].includes(request.status) && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => { approveStockRequest(request.id, user.name); setToast(`${request.id} approved. The matching stockkeeper can now issue it.`); }}
                            >
                              <CheckCircle2 size={15} /> Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={() => { rejectStockRequest(request.id, user.name); setToast(`${request.id} rejected.`); }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {canIssueRequests && request.status === 'approved' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={!canFulfill}
                            title={!canFulfill ? 'Not enough stock available' : 'Issue accountant-approved quantity'}
                            onClick={() => {
                              const result = fulfillStockRequest(request.id, user.name, user.role);
                              setToast(result.success
                                ? `${request.quantity} ${request.unit} ${request.itemName} issued to kitchen.`
                                : result.error);
                            }}
                          >
                            <PackageX size={15} /> Approve & issue
                          </button>
                        )}
                        {['pending', 'awaiting_approval'].includes(request.status) && !canReviewRequests && <span className="cell-sub">Awaiting accountant</span>}
                        {request.status === 'approved' && !canIssueRequests && <span className="cell-sub">Awaiting matching stockkeeper</span>}
                        {['fulfilled', 'rejected'].includes(request.status) && <span className="muted">—</span>}
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canIssueBeverageStock && (
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Beverage orders</h3>
              <p>Approve and issue stock only after available quantity is confirmed.</p>
            </div>
            <span className="badge badge-warning">
              {beverageOrders.filter((order) => order.beverageStatus === 'approved').length} waiting to issue
            </span>
          </div>
          {beverageOrders.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No approved beverage orders"
              description="Orders approved by the Bar Manager will appear here."
            />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Order</th><th>Table</th><th>Requested beverages</th><th>Status</th><th className="align-right">Action</th></tr>
                </thead>
                <tbody>
                  {beverageOrders.map((order) => {
                    const beverageItems = order.items.filter((item) => item.category === 'Drinks');
                    const insufficient = beverageItems
                      .map((item) => ({ item, stock: getBeverageStockLine(item) }))
                      .find(({ item, stock }) => !stock || stock.qty < item.qty);
                    const insufficientReason = !insufficient
                      ? ''
                      : !insufficient.stock
                        ? `No stock item is linked to ${insufficient.item.name}.`
                        : `Need ${insufficient.item.qty} ${insufficient.stock.unit} ${insufficient.stock.name}; only ${insufficient.stock.qty} available.`;

                    return (
                      <tr key={order.id}>
                        <td><strong>{order.id}</strong><span className="cell-sub">By {order.waiter}</span></td>
                        <td>{order.tableName}</td>
                        <td>
                          {beverageItems.map((item) => `${item.qty} × ${item.name}`).join(', ')}
                          {insufficientReason && order.beverageStatus === 'approved' && (
                            <span className="cell-sub danger">{insufficientReason}</span>
                          )}
                        </td>
                        <td><StatusBadge status={order.beverageStatus} /></td>
                        <td>
                          <div className="row-actions">
                            {order.beverageStatus === 'approved' ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                disabled={Boolean(insufficient)}
                                title={insufficientReason || 'Issue the approved beverage quantities'}
                                onClick={() => issueBeverageOrder(order)}
                              >
                                <PackageX size={15} /> Approve & issue
                              </button>
                            ) : (
                              <span className="muted">Issued by {order.beverageIssuedBy || 'storekeeper'}</span>
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
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <div>
            <h3>Recent stock movements</h3>
            <p>Auditable record of inventory received and issued.</p>
          </div>
        </div>
        {visibleMovements.length === 0 ? (
          <EmptyState icon={Package} title="No stock movements yet" description="Receipts and issues will be recorded here." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Item</th><th>Movement</th><th>Quantity</th><th>Reason</th><th>Recorded by</th><th>Time</th></tr></thead>
              <tbody>
                {visibleMovements.slice(0, 8).map((movement) => (
                  <tr key={movement.id}>
                    <td><strong>{movement.itemName}</strong></td>
                    <td><StatusBadge status={movement.direction === 'in' ? 'healthy' : 'out'} /></td>
                    <td>{movement.direction === 'in' ? '+' : '−'}{movement.quantity} {movement.unit}</td>
                    <td className="muted">{movement.reason || '—'}</td>
                    <td>{movement.actor}</td>
                    <td className="muted">{new Date(movement.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={addingProduct}
        onClose={() => setAddingProduct(false)}
        title="Add inventory product"
        subtitle="Create a product in your stock categories. Opening stock is recorded in stock movements."
      >
        <form className="user-form" onSubmit={submitNewProduct}>
          <label className="field">
            <span>Product name</span>
            <input
              type="text"
              value={newProduct.name}
              onChange={(event) => setNewProduct({ ...newProduct, name: event.target.value })}
              placeholder="e.g. Eggs or Orange juice"
              required
              autoFocus
            />
          </label>
          <div className="form-grid">
            <label className="field">
              <span>Category</span>
              <select
                value={newProduct.category}
                onChange={(event) => setNewProduct({ ...newProduct, category: event.target.value })}
              >
                {productCategories.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Unit</span>
              <input
                type="text"
                value={newProduct.unit}
                onChange={(event) => setNewProduct({ ...newProduct, unit: event.target.value })}
                placeholder="kg, bottles, pieces"
                required
              />
            </label>
            <label className="field">
              <span>Opening stock</span>
              <input
                type="number"
                min="0"
                step="any"
                value={newProduct.qty}
                onChange={(event) => setNewProduct({ ...newProduct, qty: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Reorder level</span>
              <input
                type="number"
                min="0"
                step="any"
                value={newProduct.threshold}
                onChange={(event) => setNewProduct({ ...newProduct, threshold: event.target.value })}
                required
              />
            </label>
          </div>
          {productError && <div className="form-error" role="alert">{productError}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setAddingProduct(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary"><Plus size={16} /> Add product</button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(restocking)}
        onClose={() => setRestocking(null)}
        title={restocking ? `${movementType === 'in' ? 'Receive' : 'Issue'} ${restocking.name}` : 'Stock movement'}
        subtitle={
          restocking
            ? `Current stock: ${restocking.qty} ${restocking.unit} · reorder at ${restocking.threshold} ${restocking.unit}`
            : ''
        }
      >
        {restocking && (
          <form onSubmit={submitRestock} className="restock-form">
            <label className="field">
              <span>Quantity {movementType === 'in' ? 'received' : 'issued'} ({restocking.unit})</span>
              <input
                type="number"
                min="1"
                max={movementType === 'out' ? restocking.qty : undefined}
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                autoFocus
              />
            </label>
            <div className="chip-row">
              {(movementType === 'in' ? [10, 25, 50, 100] : [1, 5, 10, 25].filter((amount) => amount <= restocking.qty)).map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className="chip"
                  onClick={() => setQuantity(String(amount))}
                >
                  +{amount}
                </button>
              ))}
            </div>
            <div className="detail-row">
              <span>New stock level</span>
              <Badge tone={restocking.qty + (movementType === 'in' ? 1 : -1) * (Number(quantity) || 0) <= restocking.threshold ? 'warning' : 'success'}>
                {formatNumber(restocking.qty + (movementType === 'in' ? 1 : -1) * (Number(quantity) || 0))} {restocking.unit}
              </Badge>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setRestocking(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {movementType === 'in' ? <PackagePlus size={16} /> : <TrendingDown size={16} />}
                {movementType === 'in' ? 'Receive stock' : 'Issue stock'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
