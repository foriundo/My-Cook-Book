import { describe, expect, it } from 'vitest';
import { applyIngredientChanges } from '../lib/modifications';

describe('ingredient modifications', () => {
  const ingredients = [
    { id: 'sugar', name: 'sugar', quantity: 2, unit: 'tbsp' },
    { id: 'flour', name: 'flour', quantity: 1, unit: 'cup' },
  ];

  it('renders changed, removed, and added rows as a diff', () => {
    const rows = applyIngredientChanges(ingredients, [
      { action: 'remove', ingredientId: 'sugar' },
      { action: 'change', ingredientId: 'flour', quantity: 1.5 },
      { action: 'add', name: 'cinnamon', quantity: 1, unit: 'tsp' },
    ]);

    expect(rows.map((row) => [row.name, row.quantity, row.changeType])).toEqual([
      ['sugar', 2, 'removed'],
      ['flour', 1.5, 'changed'],
      ['cinnamon', 1, 'added'],
    ]);
    expect(ingredients[0].quantity).toBe(2);
  });
});