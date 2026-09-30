import { describe, expect, it } from 'vitest';
import { parseTimerSeconds } from '../lib/timeParser';

describe('step timer parser', () => {
  it('parses minutes and hours from recipe instructions', () => {
    expect(parseTimerSeconds('Bake for 25 minutes')).toBe(1500);
    expect(parseTimerSeconds('Simmer for 1 hr 20 minutes')).toBe(4800);
    expect(parseTimerSeconds('Rest 30 seconds')).toBe(30);
  });

  it('returns null when no duration is present', () => {
    expect(parseTimerSeconds('Stir until smooth')).toBeNull();
  });
});