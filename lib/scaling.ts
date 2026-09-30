import { toFraction } from './fractions';

export function scaleFactor(baseServings: number, targetServings: number) {
  return targetServings / Math.max(baseServings, 1);
}

export function scaleIngredient(quantity: number, baseServings: number, targetServings: number) {
  return quantity * scaleFactor(baseServings, targetServings);
}

export function formatFraction(value: number) {
  const normalized = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(normalized * 1000) / 1000;
  return toFraction(rounded);
}
