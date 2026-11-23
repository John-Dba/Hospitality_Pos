import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_DATA, MENU_ITEMS } from '../data/constants';
import { canManageInventoryCategory } from '../utils/inventoryAccess';

const DataContext = createContext(null);
const STORAGE_KEY = 'aurora-pos-data';

const clone = (value) => JSON.parse(JSON.stringify(value));

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const beverageManager = DEFAULT_DATA.users.find((account) => account.role === 'bar_manager');
      const users = (parsed.users || clone(DEFAULT_DATA.users)).map((account) => ({
        ...account,
        role: account.role === 'storekeeper' ? 'food_storekeeper' : account.role,
        ...(typeof account.email === 'string' && account.email.toLowerCase().endsWith('@aurora.com')
          ? { email: `${account.username}@example.com` }
          : {}),
      }));
      const beverageStorekeeper = DEFAULT_DATA.users.find(
        (account) => account.role === 'beverage_storekeeper',
      );
      if (!users.some((account) => account.username === beverageStorekeeper.username)) {
        users.push(clone(beverageStorekeeper));
      }
      if (!users.some((account) => account.username === beverageManager.username)) {
        users.push(clone(beverageManager));
      }
      const inventory = parsed.inventory || clone(DEFAULT_DATA.inventory);
      DEFAULT_DATA.inventory
        .filter((item) => item.category === 'Beverages' && !inventory.some((entry) => entry.id === item.id))
        .forEach((item) => inventory.push(clone(item)));
      const orders = (parsed.orders || clone(DEFAULT_DATA.orders)).map((order) => {
        const items = (order.items || []).map((item) => {
          const menuItem = MENU_ITEMS.find((entry) => entry.id === item.id);
          return { ...item, category: item.category || menuItem?.category || (item.id.startsWith('d') ? 'Drinks' : 'Food') };
        });
        const hasBeverages = items.some((item) => item.category === 'Drinks');
        return {
          ...order,
          items,
          ...(hasBeverages && !order.beverageStatus
            ? { beverageStatus: order.status === 'completed' ? 'approved' : 'pending' }
            : {}),
        };
      });
      return {
        orders,
        rooms: parsed.rooms || clone(DEFAULT_DATA.rooms),
        inventory,
        tables: parsed.tables || clone(DEFAULT_DATA.tables),
        users,
        stockRequests: parsed.stockRequests || [],
        inventoryMovements: parsed.inventoryMovements || [],
        activity: parsed.activity || [],
      };
    }
  } catch {
    /* ignore corrupted storage */
  }
  return clone(DEFAULT_DATA);
}

export function DataProvider({ children }) {
  const [data, setData] = useState(loadData);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota errors */
    }
  }, [data]);

  const value = useMemo(() => {
    const addOrder = (order) =>
      setData((current) => {
        const numbers = current.orders
          .map((item) => Number.parseInt(String(item.id).replace(/\D/g, ''), 10))
          .filter((num) => Number.isFinite(num));
        const nextNumber = (numbers.length ? Math.max(...numbers) : 1040) + 1;
        const newOrder = {
          id: `ORD-${nextNumber}`,
          createdAt: new Date().toISOString(),
          status: 'pending',
          payment: 'unpaid',
          note: '',
          ...order,
        };
        const orderItems = newOrder.items.map((item) => ({
          ...item,
          category: item.category || MENU_ITEMS.find((entry) => entry.id === item.id)?.category,
        }));
        const createdAt = new Date().toISOString();
        const hasBeverages = orderItems.some((item) => item.category === 'Drinks');
        return {
          ...current,
          orders: [{
            ...newOrder,
            items: orderItems,
            ...(hasBeverages ? { beverageStatus: 'pending' } : {}),
            createdAt,
          }, ...current.orders],
          tables: current.tables.map((table) =>
            table.id === newOrder.tableId ? { ...table, status: 'occupied' } : table,
          ),
          activity: [{
            id: `act-${Date.now()}`,
            actor: newOrder.waiter,
            type: 'order-created',
            details: `Created ${newOrder.id} for ${newOrder.tableName}`,
            createdAt,
          }, ...current.activity],
        };
      });

    const advanceOrder = (id, status, actor) =>
      setData((current) => {
        const order = current.orders.find((entry) => entry.id === id);
        if (!order) return current;
        const event = {
          id: `act-${Date.now()}`,
          actor: actor || 'System',
          type: status === 'completed' ? 'order-completed' : 'order-updated',
          details: `${order.id} moved to ${status}`,
          createdAt: new Date().toISOString(),
        };
        return {
          ...current,
          orders: current.orders.map((entry) =>
            entry.id === id
              ? { ...entry, status, updatedBy: actor || 'System', updatedAt: event.createdAt,
                ...(status === 'completed' ? { completedBy: actor || 'System' } : {}) }
              : entry,
          ),
          activity: [event, ...current.activity],
        };
      });

    const setOrderPayment = (id, payment, actor = 'System') =>
      setData((current) => ({
        ...current,
        orders: current.orders.map((order) =>
          order.id === id ? { ...order, payment } : order,
        ),
        activity: [{
          id: `act-${Date.now()}`,
          actor,
          type: 'payment-recorded',
          details: `Payment ${payment} for ${id}`,
          createdAt: new Date().toISOString(),
        }, ...current.activity],
      }));

    const approveBeverageOrder = (id, actor, role) => {
      if (!['bar_manager', 'manager', 'admin'].includes(role)) {
        return { success: false, error: 'Only a Bar Manager or authorized manager can approve beverage orders.' };
      }
      const order = data.orders.find((entry) => entry.id === id);
      if (!order || order.beverageStatus !== 'pending') {
        return { success: false, error: 'This beverage order is no longer waiting for approval.' };
      }
      const beverageItems = order.items.filter((item) => item.category === 'Drinks');
      if (beverageItems.length === 0) {
        return { success: false, error: 'This order does not contain any beverage items.' };
      }

      const createdAt = new Date().toISOString();
      const responsible = actor || 'Bar Manager';
      setData((current) => ({
        ...current,
        orders: current.orders.map((entry) =>
          entry.id === id
            ? { ...entry, beverageStatus: 'approved', beverageApprovedBy: responsible, beverageApprovedAt: createdAt }
            : entry,
        ),
        activity: [{
          id: `act-${Date.now()}`,
          actor: responsible,
          type: 'beverage-order-approved',
          details: `Approved beverage items for ${id}; waiting for storekeeper to issue stock`,
          createdAt,
        }, ...current.activity],
      }));
      return { success: true };
    };

    const fulfillBeverageOrder = (id, actor, role) => {
      if (!['admin', 'manager', 'beverage_storekeeper'].includes(role)) {
        return { success: false, error: 'Only a Beverage Storekeeper or authorized manager can issue beverage stock.' };
      }
      const order = data.orders.find((entry) => entry.id === id);
      if (!order || order.beverageStatus !== 'approved') {
        return { success: false, error: 'This beverage order is not approved and waiting for issue.' };
      }

      const deductions = new Map();
      for (const orderItem of order.items.filter((item) => item.category === 'Drinks')) {
        const menuItem = MENU_ITEMS.find((item) => item.id === orderItem.id);
        const inventoryItem = data.inventory.find(
          (item) => item.id === menuItem?.inventoryItemId && item.category === 'Beverages',
        );
        if (!inventoryItem) {
          return { success: false, error: `No beverage stock item is linked to ${orderItem.name}.` };
        }
        const deduction = deductions.get(inventoryItem.id) || { item: inventoryItem, quantity: 0 };
        deduction.quantity += orderItem.qty;
        deductions.set(inventoryItem.id, deduction);
      }

      for (const { item, quantity } of deductions.values()) {
        if (item.qty < quantity) {
          return {
            success: false,
            error: `Cannot issue ${quantity} ${item.unit} ${item.name}. Available stock is ${item.qty} ${item.unit}.`,
          };
        }
      }

      const createdAt = new Date().toISOString();
      const responsible = actor || 'Beverage Storekeeper';
      setData((current) => ({
        ...current,
        orders: current.orders.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                beverageStatus: 'issued',
                beverageIssuedBy: responsible,
                beverageIssuedAt: createdAt,
              }
            : entry,
        ),
        inventory: current.inventory.map((item) => {
          const deduction = deductions.get(item.id);
          return deduction ? { ...item, qty: item.qty - deduction.quantity } : item;
        }),
        inventoryMovements: [
          ...Array.from(deductions.values(), ({ item, quantity }) => ({
            id: `mov-${Date.now()}-${item.id}`,
            itemId: item.id,
            itemName: item.name,
            category: item.category,
            quantity,
            unit: item.unit,
            direction: 'out',
            reason: `Bar order ${id}`,
            actor: responsible,
            createdAt,
          })),
          ...current.inventoryMovements,
        ],
        activity: [{
          id: `act-${Date.now()}`,
          actor: responsible,
          type: 'beverage-stock-issued',
          details: `Issued beverage stock for ${id} and updated inventory`,
          createdAt,
        }, ...current.activity],
      }));
      return { success: true };
    };

    const setTableStatus = (id, status) =>
      setData((current) => ({
        ...current,
        tables: current.tables.map((table) =>
          table.id === id ? { ...table, status } : table,
        ),
      }));

    const setRoomStatus = (id, status, actor = 'System') =>
      setData((current) => {
        const room = current.rooms.find((entry) => entry.id === id);
        if (!room) return current;
        const createdAt = new Date().toISOString();
        return {
          ...current,
          rooms: current.rooms.map((entry) =>
            entry.id === id
              ? { ...entry, status, guest: status === 'occupied' ? entry.guest : null, updatedBy: actor, updatedAt: createdAt }
              : entry,
          ),
          activity: [{
            id: `act-${Date.now()}`,
            actor,
            type: 'room-updated',
            details: `Room ${id} marked ${status}`,
            createdAt,
          }, ...current.activity],
        };
      });

    const recordInventoryMovement = (id, quantity, direction, actor, reason = '', role) =>
      setData((current) => {
        const item = current.inventory.find((entry) => entry.id === id);
        if (!item || !Number.isFinite(quantity) || quantity <= 0) return current;
        if (!canManageInventoryCategory(role, item.category)) return current;
        if (direction === 'out' && item.qty < quantity) return current;
        const createdAt = new Date().toISOString();
        const movement = {
          id: `mov-${Date.now()}`,
          itemId: id,
          itemName: item.name,
          category: item.category,
          quantity,
          unit: item.unit,
          direction,
          reason,
          actor: actor || 'System',
          createdAt,
        };
        return {
          ...current,
          inventory: current.inventory.map((entry) =>
            entry.id === id
              ? { ...entry, qty: entry.qty + (direction === 'in' ? quantity : -quantity) }
              : entry,
          ),
          inventoryMovements: [movement, ...current.inventoryMovements],
          activity: [{
            id: `act-${Date.now()}`,
            actor: actor || 'System',
            type: direction === 'in' ? 'stock-received' : 'stock-issued',
            details: `${direction === 'in' ? 'Received' : 'Issued'} ${quantity} ${item.unit} ${item.name}${reason ? ` · ${reason}` : ''}`,
            createdAt,
          }, ...current.activity],
        };
      });

    const restockItem = (id, quantity, actor, role) =>
      recordInventoryMovement(id, quantity, 'in', actor, 'Supplier delivery', role);

    const issueItem = (id, quantity, actor, reason, role) =>
      recordInventoryMovement(id, quantity, 'out', actor, reason || 'Manual stock issue', role);

    const addInventoryItem = (item, actor, role) => {
      const name = String(item.name || '').trim();
      const category = String(item.category || '').trim();
      const unit = String(item.unit || '').trim();
      const qty = Number(item.qty);
      const threshold = Number(item.threshold);

      if (!name || !unit || !canManageInventoryCategory(role, category)) {
        return { success: false, error: 'Enter a product name, unit, and an allowed category.' };
      }
      if (!Number.isFinite(qty) || qty < 0 || !Number.isFinite(threshold) || threshold < 0) {
        return { success: false, error: 'Initial stock and reorder level must be zero or greater.' };
      }
      if (data.inventory.some(
        (entry) => entry.category === category && entry.name.trim().toLowerCase() === name.toLowerCase(),
      )) {
        return { success: false, error: 'A product with this name already exists in the selected category.' };
      }

      const createdAt = new Date().toISOString();
      const id = `i${Date.now()}`;
      const newItem = { id, name, category, qty, unit, threshold };
      const movement = qty > 0 ? {
        id: `mov-${Date.now()}`,
        itemId: id,
        itemName: name,
        category,
        quantity: qty,
        unit,
        direction: 'in',
        reason: 'Opening stock',
        actor: actor || 'System',
        createdAt,
      } : null;

      setData((current) => ({
        ...current,
        inventory: [...current.inventory, newItem],
        inventoryMovements: movement
          ? [movement, ...current.inventoryMovements]
          : current.inventoryMovements,
        activity: [{
          id: `act-${Date.now()}`,
          actor: actor || 'System',
          type: 'stock-item-added',
          details: `Added ${name} to ${category} inventory`,
          createdAt,
        }, ...current.activity],
      }));
      return { success: true };
    };

    const createStockRequest = (request) =>
      setData((current) => {
        const item = current.inventory.find((entry) => entry.id === request.itemId);
        if (!item || !Number.isFinite(request.quantity) || request.quantity <= 0) return current;
        const createdAt = new Date().toISOString();
        const record = {
          id: `REQ-${Date.now()}`,
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          unit: item.unit,
          quantity: request.quantity,
          requestedBy: request.requestedBy || 'Kitchen',
          note: request.note || '',
          status: 'awaiting_approval',
          createdAt,
        };
        return {
          ...current,
          stockRequests: [record, ...current.stockRequests],
          activity: [{
            id: `act-${Date.now()}`,
            actor: record.requestedBy,
            type: 'stock-requested',
            details: `Requested ${record.quantity} ${item.unit} ${item.name} from store`,
            createdAt,
          }, ...current.activity],
        };
      });

    const approveStockRequest = (id, actor) =>
      setData((current) => {
        const request = current.stockRequests.find((entry) => entry.id === id);
        if (!request || !['pending', 'awaiting_approval'].includes(request.status)) return current;
        const createdAt = new Date().toISOString();
        return {
          ...current,
          stockRequests: current.stockRequests.map((entry) =>
            entry.id === id
              ? { ...entry, status: 'approved', approvedBy: actor, approvedAt: createdAt }
              : entry,
          ),
          activity: [{
            id: `act-${Date.now()}`,
            actor: actor || 'Accountant',
            type: 'stock-request-approved',
            details: `Approved ${request.id} for ${request.quantity} ${request.unit} ${request.itemName}`,
            createdAt,
          }, ...current.activity],
        };
      });

    const rejectStockRequest = (id, actor) =>
      setData((current) => {
        const request = current.stockRequests.find((entry) => entry.id === id);
        if (!request || !['pending', 'awaiting_approval'].includes(request.status)) return current;
        const createdAt = new Date().toISOString();
        return {
          ...current,
          stockRequests: current.stockRequests.map((entry) =>
            entry.id === id
              ? { ...entry, status: 'rejected', rejectedBy: actor, rejectedAt: createdAt }
              : entry,
          ),
          activity: [{
            id: `act-${Date.now()}`,
            actor: actor || 'Accountant',
            type: 'stock-request-rejected',
            details: `Rejected ${request.id} for ${request.quantity} ${request.unit} ${request.itemName}`,
            createdAt,
          }, ...current.activity],
        };
      });

    const fulfillStockRequest = (id, actor, role) => {
      const request = data.stockRequests.find((entry) => entry.id === id);
      const item = data.inventory.find((entry) => entry.id === request?.itemId);
      if (!request || request.status !== 'approved') {
        return { success: false, error: 'This request is not approved and ready to issue.' };
      }
      if (!item) {
        return { success: false, error: 'The requested inventory item no longer exists.' };
      }
      if (!canManageInventoryCategory(role, item.category)) {
        return { success: false, error: 'Your role cannot issue this inventory category.' };
      }
      if (!Number.isFinite(request.quantity) || request.quantity <= 0) {
        return { success: false, error: 'The requested quantity is invalid.' };
      }
      if (item.qty < request.quantity) {
        return {
          success: false,
          error: `Cannot issue ${request.quantity} ${item.unit} ${item.name}. Available stock is ${item.qty} ${item.unit}.`,
        };
      }

      setData((current) => {
        const createdAt = new Date().toISOString();
        const movement = {
          id: `mov-${Date.now()}`,
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          quantity: request.quantity,
          unit: item.unit,
          direction: 'out',
          reason: `Kitchen request ${request.id}`,
          actor: actor || 'Storekeeper',
          createdAt,
        };
        return {
          ...current,
          stockRequests: current.stockRequests.map((entry) =>
            entry.id === id ? { ...entry, status: 'fulfilled', fulfilledBy: actor, fulfilledAt: createdAt } : entry,
          ),
          inventory: current.inventory.map((entry) =>
            entry.id === item.id ? { ...entry, qty: entry.qty - request.quantity } : entry,
          ),
          inventoryMovements: [movement, ...current.inventoryMovements],
          activity: [{
            id: `act-${Date.now()}`,
            actor: actor || 'Storekeeper',
            type: 'stock-issued',
            details: `Issued ${request.quantity} ${item.unit} ${item.name} to kitchen`,
            createdAt,
          }, ...current.activity],
        };
      });
      return { success: true };
    };

    const addUser = (user, actor = 'Administrator') =>
      setData((current) => ({
        ...current,
        users: [
          ...current.users,
          {
            id: `u${Date.now()}`,
            active: true,
            color: '#6366f1',
            ...user,
          },
        ],
        activity: [{
          id: `act-${Date.now()}`,
          actor,
          type: 'employee-added',
          details: `Added ${user.name} as ${user.role}`,
          createdAt: new Date().toISOString(),
        }, ...current.activity],
      }));

    const updateUser = (id, patch) =>
      setData((current) => ({
        ...current,
        users: current.users.map((user) =>
          user.id === id ? { ...user, ...patch } : user,
        ),
      }));

    const toggleUserActive = (id, actor = 'Administrator') =>
      setData((current) => ({
        ...current,
        users: current.users.map((user) =>
          user.id === id ? { ...user, active: !user.active } : user,
        ),
        activity: [{
          id: `act-${Date.now()}`,
          actor,
          type: 'employee-access',
          details: `Updated access for ${current.users.find((user) => user.id === id)?.name || id}`,
          createdAt: new Date().toISOString(),
        }, ...current.activity],
      }));

    const resetData = () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setData(clone(DEFAULT_DATA));
    };

    return {
      ...data,
      addOrder,
      advanceOrder,
      setOrderPayment,
      approveBeverageOrder,
      setTableStatus,
      setRoomStatus,
      restockItem,
      issueItem,
      addInventoryItem,
      createStockRequest,
      approveStockRequest,
      rejectStockRequest,
      fulfillStockRequest,
      fulfillBeverageOrder,
      addUser,
      updateUser,
      toggleUserActive,
      resetData,
    };
  }, [data]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useAppData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useAppData must be used within DataProvider');
  return context;
}
