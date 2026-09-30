'use client';

import { useEffect, useMemo, useState } from 'react';
import { combineShoppingItems, shoppingAisle } from '@/lib/shoppingList';

type ShoppingItem = { id: string; name: string; quantity: number | null; unit: string | null; checked: boolean };
type RecipeOption = { id: string; title: string; baseServings: number };

export function ShoppingListPanel() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [recipeId, setRecipeId] = useState('');
  const [servings, setServings] = useState(4);
  const [error, setError] = useState('');

  async function loadItems() {
    const response = await fetch('/api/shopping-list');
    if (response.ok) setItems(await response.json());
  }

  useEffect(() => {
    void Promise.all([fetch('/api/shopping-list'), fetch('/api/recipes')]).then(async ([itemResponse, recipeResponse]) => {
      if (itemResponse.ok) setItems(await itemResponse.json());
      if (recipeResponse.ok) setRecipes(await recipeResponse.json());
    });
  }, []);

  const selectedRecipe = recipes.find((recipe) => recipe.id === recipeId);
  const groupedItems = useMemo(() => {
    const groups = new Map<string, ShoppingItem[]>();
    for (const item of items) {
      const key = `${item.name.trim().toLowerCase()}|${(item.unit ?? '').trim().toLowerCase()}`;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return [...groups.values()].map((group) => ({
      records: group,
      ...combineShoppingItems(group)[0],
      checked: group.every((item) => item.checked),
    })).sort((a, b) => shoppingAisle(a.name).localeCompare(shoppingAisle(b.name)) || a.name.localeCompare(b.name));
  }, [items]);

  async function addManualItem(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch('/api/shopping-list', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, quantity: quantity ? Number(quantity) : null, unit: unit || null }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? 'Could not add item.');
      return;
    }
    setName(''); setQuantity(''); setUnit(''); setError('');
    await loadItems();
  }

  async function addRecipeItems() {
    if (!recipeId) return;
    const response = await fetch('/api/shopping-list', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId, servings }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? 'Could not add recipe ingredients.');
      return;
    }
    setError('');
    await loadItems();
  }

  async function updateGroup(group: typeof groupedItems[number], checked: boolean) {
    await Promise.all(group.records.map((item) => fetch(`/api/shopping-list/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checked }),
    })));
    await loadItems();
  }

  async function removeGroup(group: typeof groupedItems[number]) {
    await Promise.all(group.records.map((item) => fetch(`/api/shopping-list/${item.id}`, { method: 'DELETE' })));
    await loadItems();
  }

  async function copyList() {
    const text = groupedItems.map((item) => `${item.checked ? '[x]' : '[ ]'} ${item.quantity ?? ''} ${item.unit ?? ''} ${item.name}`.replace(/\s+/g, ' ').trim()).join('\n');
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="mt-6 max-w-4xl">
      <div className="grid gap-6 border-b border-slate-200 pb-6 lg:grid-cols-2">
        <form onSubmit={addManualItem} className="space-y-3">
          <h2 className="font-semibold text-slate-900">Add an item</h2>
          <div className="grid grid-cols-[1fr_90px_100px] gap-2">
            <input aria-label="Item name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ingredient" className="min-w-0 rounded-lg border border-slate-300 px-3 py-2" required />
            <input aria-label="Quantity" type="number" min="0" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Qty" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            <input aria-label="Unit" value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="Unit" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Add item</button>
        </form>

        <div className="space-y-3">
          <h2 className="font-semibold text-slate-900">Add from a recipe</h2>
          <div className="flex gap-2">
            <select aria-label="Recipe" value={recipeId} onChange={(event) => { setRecipeId(event.target.value); const item = recipes.find((recipe) => recipe.id === event.target.value); if (item) setServings(item.baseServings); }} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2">
              <option value="">Choose recipe</option>
              {recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.title}</option>)}
            </select>
            <input aria-label="Servings" type="number" min={1} max={100} value={servings} onChange={(event) => setServings(Math.min(100, Math.max(1, Number(event.target.value) || 1)))} className="w-20 rounded-lg border border-slate-300 px-3 py-2" />
            <button type="button" disabled={!selectedRecipe} onClick={addRecipeItems} className="rounded-lg bg-orange-600 px-3 py-2 text-sm text-white disabled:opacity-50">Add</button>
          </div>
        </div>
      </div>

      {error && <p role="status" className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Your list</h2>
        <button type="button" onClick={copyList} disabled={!groupedItems.length} className="text-sm text-slate-700 underline disabled:opacity-50">Copy as text</button>
      </div>
      {!groupedItems.length ? <p className="mt-4 text-slate-600">Your shopping list is empty.</p> : (
        <div className="mt-3 divide-y divide-slate-200">
          {groupedItems.map((group) => (
            <div key={group.records[0].id} className="flex items-center gap-3 py-3">
              <input type="checkbox" checked={group.checked} onChange={(event) => updateGroup(group, event.target.checked)} aria-label={`Mark ${group.name} checked`} />
              <span className="w-28 text-xs uppercase text-slate-500">{shoppingAisle(group.name)}</span>
              <span className={`min-w-0 flex-1 ${group.checked ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{group.name}</span>
              <span className="text-sm text-slate-600">{group.quantity ?? ''} {group.unit ?? ''}</span>
              <button type="button" onClick={() => removeGroup(group)} className="text-sm text-slate-500 underline">Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}