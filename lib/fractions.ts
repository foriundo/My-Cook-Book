export function toFraction(value: number): string {
  const abs = Math.abs(value);
  const whole = Math.floor(abs);
  const fraction = abs - whole;
  const candidates = [
    [1, 8],
    [1, 6],
    [1, 5],
    [1, 4],
    [1, 3],
    [2, 5],
    [1, 2],
    [3, 5],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [7, 8],
  ];

  let best = { numerator: 1, denominator: 1, diff: Number.POSITIVE_INFINITY };

  for (const [n, d] of candidates) {
    const diff = Math.abs(fraction - n / d);
    if (diff < best.diff) {
      best = { numerator: n, denominator: d, diff };
    }
  }

  const numerator = best.numerator;
  const denominator = best.denominator;
  const sign = value < 0 ? '-' : '';

  if (fraction < 0.08) {
    return `${sign}${whole || 0}`;
  }

  if (whole === 0) {
    return `${sign}${fractionToUnicode(numerator, denominator)}`;
  }

  return `${sign}${whole}${fractionToUnicode(numerator, denominator)}`;
}

function fractionToUnicode(numerator: number, denominator: number): string {
  const map: Record<string, string> = {
    '1/8': '⅛',
    '1/6': '⅙',
    '1/5': '⅕',
    '1/4': '¼',
    '1/3': '⅓',
    '2/5': '⅖',
    '1/2': '½',
    '3/5': '⅗',
    '2/3': '⅔',
    '3/4': '¾',
    '4/5': '⅘',
    '5/6': '⅚',
    '7/8': '⅞',
  };

  return map[`${numerator}/${denominator}`] ?? `${numerator}/${denominator}`;
}
