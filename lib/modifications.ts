export type IngredientRecord = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  note?: string | null;
  group?: string | null;
  scalable?: boolean;
};

export type IngredientChange =
  | { action: 'add'; name: string; quantity?: number | null; unit?: string | null; note?: string | null }
  | { action: 'change'; ingredientId: string; quantity?: number | null; unit?: string | null; note?: string | null }
  | { action: 'remove'; ingredientId: string };

export function applyIngredientChanges(ingredients: IngredientRecord[], changes: IngredientChange[]) {
  const removedIds = new Set(changes.filter((change): change is Extract<IngredientChange, { action: 'remove' }> => change.action === 'remove').map((change) => change.ingredientId));
  const changedById = new Map(changes.filter((change): change is Extract<IngredientChange, { action: 'change' }> => change.action === 'change').map((change) => [change.ingredientId, change]));
  const rows: Array<IngredientRecord & { changeType: 'original' | 'removed' | 'changed' | 'added' }> = ingredients.map((ingredient) => {
    if (removedIds.has(ingredient.id)) return { ...ingredient, changeType: 'removed' as const };
    const change = changedById.get(ingredient.id);
    if (!change) return { ...ingredient, changeType: 'original' as const };
    return {
      ...ingredient,
      quantity: change.quantity === undefined ? ingredient.quantity : change.quantity,
      unit: change.unit === undefined ? ingredient.unit : change.unit,
      note: change.note === undefined ? ingredient.note : change.note,
      changeType: 'changed' as const,
    };
  });

  changes.filter((change): change is Extract<IngredientChange, { action: 'add' }> => change.action === 'add').forEach((change, index) => {
    rows.push({
      id: `mod-added-${index}`,
      name: change.name,
      quantity: change.quantity ?? null,
      unit: change.unit ?? null,
      note: change.note ?? null,
      scalable: true,
      changeType: 'added',
    });
  });

  return rows;
}