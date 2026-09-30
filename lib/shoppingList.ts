export type ShoppingItemInput = { name: string; quantity: number | null; unit: string | null };

export function combineShoppingItems(items: ShoppingItemInput[]) {
  const combined = new Map<string, ShoppingItemInput>();
  for (const item of items) {
    const key = `${item.name.trim().toLowerCase()}|${(item.unit ?? '').trim().toLowerCase()}`;
    const existing = combined.get(key);
    if (!existing) combined.set(key, { ...item });
    else if (existing.quantity !== null && item.quantity !== null) existing.quantity += item.quantity;
  }
  return [...combined.values()];
}

export function shoppingAisle(name: string) {
  const value = name.toLowerCase();
  if (/milk|cheese|butter|cream|yogurt|egg/.test(value)) return 'Dairy';
  if (/beef|chicken|pork|fish|turkey|shrimp/.test(value)) return 'Meat & seafood';
  if (/tomato|lettuce|onion|garlic|pepper|carrot|potato|herb|fruit|vegetable/.test(value)) return 'Produce';
  if (/flour|sugar|rice|pasta|bean|oil|spice|salt|oat/.test(value)) return 'Pantry';
  return 'Other';
}