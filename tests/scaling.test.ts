import { describe, expect, it } from 'vitest';
import { formatFraction, scaleIngredient, scaleFactor } from '../lib/scaling';
import { convertQuantity } from '../lib/units';
import { parseIngredientLine } from '../lib/ingredientParser';

describe('scaling utilities', () => {
  it('formats common fractions', () => {
    expect(formatFraction(0.333)).toBe('⅓');
    expect(formatFraction(1.5)).toBe('1½');
    expect(formatFraction(3.25)).toBe('3¼');
  });

  it('computes scale factors', () => {
    expect(scaleFactor(4, 6)).toBeCloseTo(1.5, 5);
    expect(scaleFactor(2, 1)).toBeCloseTo(0.5, 5);
  });

  it('scales ingredient quantities', () => {
    expect(scaleIngredient(1, 4, 6)).toBeCloseTo(1.5, 5);
    expect(scaleIngredient(2.5, 4, 8)).toBeCloseTo(5, 5);
  });

  it('converts to metric and US units', () => {
    expect(convertQuantity(1, 'cup', 'metric')).toBeCloseTo(240, 0);
    expect(convertQuantity(8, 'oz', 'metric')).toBeCloseTo(227, 0);
    expect(convertQuantity(1, 'tbsp', 'us')).toBeCloseTo(0.5, 5);
  });

  it('parses ingredient strings', () => {
    const item = parseIngredientLine('2 1/2 cups flour, sifted');
    expect(item.quantity).toBe(2.5);
    expect(item.unit).toBe('cup');
    expect(item.name).toBe('flour');
    expect(item.note).toBe('sifted');
  });

  it('supports unicode fraction ingredients', () => {
    const item = parseIngredientLine('1½ cups flour');
    expect(item.quantity).toBeCloseTo(1.5, 5);
    expect(item.unit).toBe('cup');
    expect(item.name).toBe('flour');
  });

  it('supports range ingredient quantities', () => {
    const item = parseIngredientLine('2-3 cloves garlic');
    expect(item.quantity).toBeCloseTo(2.5, 5);
    expect(item.unit).toBe('clove');
    expect(item.name).toBe('garlic');
  });

  it('keeps count ingredients as names when no separate ingredient follows', () => {
    const item = parseIngredientLine('2 eggs');
    expect(item.quantity).toBe(2);
    expect(item.unit).toBeNull();
    expect(item.name).toBe('eggs');
  });
});
