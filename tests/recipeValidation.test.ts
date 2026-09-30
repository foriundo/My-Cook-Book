import { describe, expect, it } from 'vitest';
import { recipeInputSchema } from '../lib/recipeValidation';

describe('recipe input validation', () => {
  it('accepts a structured recipe payload', () => {
    const result = recipeInputSchema.safeParse({
      title: 'Tomato soup',
      baseServings: 4,
      ingredients: [{ name: 'tomatoes', quantity: 2, unit: 'cup', scalable: true }],
      steps: [{ text: 'Simmer for 20 minutes', timerSeconds: 1200 }],
    });

    expect(result.success).toBe(true);
  });

  it('rejects missing titles, excessive serving counts, and invalid nested rows', () => {
    expect(recipeInputSchema.safeParse({ baseServings: 4 }).success).toBe(false);
    expect(recipeInputSchema.safeParse({ title: 'Soup', baseServings: 101 }).success).toBe(false);
    expect(recipeInputSchema.safeParse({ title: 'Soup', ingredients: [{ name: '' }] }).success).toBe(false);
    expect(recipeInputSchema.safeParse({ title: 'Soup', steps: [{ text: '  ' }] }).success).toBe(false);
  });
});