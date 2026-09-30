import { describe, expect, it } from 'vitest';
import { combineShoppingItems, shoppingAisle } from '../lib/shoppingList';

describe('shopping list helpers', () => {
  it('combines matching names only when units match', () => {
    expect(combineShoppingItems([
      { name: 'Milk', quantity: 2, unit: 'cup' },
      { name: 'milk', quantity: 1, unit: 'cup' },
      { name: 'milk', quantity: 1, unit: 'l' },
    ])).toEqual([
      { name: 'Milk', quantity: 3, unit: 'cup' },
      { name: 'milk', quantity: 1, unit: 'l' },
    ]);
  });

  it('assigns common grocery aisles', () => {
    expect(shoppingAisle('whole milk')).toBe('Dairy');
    expect(shoppingAisle('chicken breast')).toBe('Meat & seafood');
    expect(shoppingAisle('tomato')).toBe('Produce');
    expect(shoppingAisle('flour')).toBe('Pantry');
  });
});