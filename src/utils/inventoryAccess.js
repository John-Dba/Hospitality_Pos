const FOOD_CATEGORIES = ['Food Supplies', 'Meat & Fish', 'Vegetables'];
const INVENTORY_CATEGORIES = [...FOOD_CATEGORIES, 'Beverages'];

export function getInventoryCategoriesForRole(role) {
  if (role === 'food_storekeeper') return FOOD_CATEGORIES;
  if (role === 'beverage_storekeeper') return ['Beverages'];
  return INVENTORY_CATEGORIES;
}

export function canAccessInventoryCategory(role, category) {
  if (role === 'food_storekeeper') return FOOD_CATEGORIES.includes(category);
  if (role === 'beverage_storekeeper') return category === 'Beverages';
  return true;
}

export function canManageInventoryCategory(role, category) {
  if (['admin', 'manager'].includes(role)) return true;
  return ['food_storekeeper', 'beverage_storekeeper'].includes(role) &&
    canAccessInventoryCategory(role, category);
}
