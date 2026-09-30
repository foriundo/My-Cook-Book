export function parseIngredientLine(raw: string) {
  const text = normalizeIngredientText(raw.trim());
  if (!text) {
    return { quantity: null, unit: null, name: '', note: null };
  }

  if (/^to taste/i.test(text)) {
    return { quantity: null, unit: null, name: 'seasoning', note: 'to taste' };
  }

  const match = text.match(/^(\d+\s+\d+\/\d+|\d+\s*[-–]\s*\d+(?:\/\d+)?(?:\.\d+)?|\d+\/\d+|\d+(?:\.\d+)?)(?:\s+([A-Za-z/]+))?\s*(.*)$/);

  if (!match) {
    return { quantity: null, unit: null, name: text, note: null };
  }

  const [, quantityRaw, unitRaw, remainder] = match;
  const quantity = parseNumericQuantity(quantityRaw ?? '');
  const normalizedUnit = unitRaw ? normalizeUnit(unitRaw.trim()) : null;
  const isUnit = normalizedUnit ? knownUnits.has(normalizedUnit) : false;
  const unit = isUnit ? normalizedUnit : null;
  const remainderClean = [isUnit ? '' : unitRaw, remainder].filter(Boolean).join(' ').replace(/^,\s*/, '').trim();

  if (!remainderClean) {
    return { quantity, unit, name: '', note: null };
  }

  const noteMatch = remainderClean.match(/^(.*?)(?:,\s*(.*))$/);
  const name = noteMatch ? noteMatch[1].trim() : remainderClean;
  const note = noteMatch && noteMatch[2] ? noteMatch[2].trim() : null;

  return { quantity, unit, name, note };
}

function parseNumericQuantity(value: string): number | null {
  const clean = normalizeIngredientText(value.trim());
  if (!clean) return null;
  if (clean.includes('/')) {
    const normalized = clean.replace(/\s+/g, ' ').trim();
    const fractionMatch = normalized.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const whole = Number(fractionMatch[1]);
      const numerator = Number(fractionMatch[2]);
      const denominator = Number(fractionMatch[3]);
      return whole + numerator / denominator;
    }

    const simple = normalized.match(/^(\d+)\/(\d+)$/);
    if (simple) {
      return Number(simple[1]) / Number(simple[2]);
    }
  }

  const range = clean.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?|\d+\/\d+)$/);
  if (range) {
    const start = Number(range[1]);
    const end = range[2].includes('/') ? parseNumericQuantity(range[2]) ?? start : Number(range[2]);
    return (start + end) / 2;
  }

  return Number(clean);
}

function normalizeIngredientText(value: string) {
  const map: Record<string, string> = {
    '¼': '1/4',
    '½': '1/2',
    '¾': '3/4',
    '⅐': '1/7',
    '⅑': '1/9',
    '⅒': '1/10',
    '⅓': '1/3',
    '⅔': '2/3',
    '⅕': '1/5',
    '⅖': '2/5',
    '⅗': '3/5',
    '⅘': '4/5',
    '⅙': '1/6',
    '⅚': '5/6',
    '⅛': '1/8',
    '⅜': '3/8',
    '⅝': '5/8',
    '⅞': '7/8',
  };

  let normalized = value;
  for (const [symbol, fraction] of Object.entries(map)) {
    normalized = normalized.replace(new RegExp(`([0-9])${escapeRegex(symbol)}`, 'g'), `$1 ${fraction}`);
    normalized = normalized.replace(new RegExp(escapeRegex(symbol), 'g'), fraction);
  }

  return normalized.replace(/\s+/g, ' ').trim();
}

function normalizeUnit(unit: string) {
  const lower = unit.toLowerCase();
  if (lower.endsWith('s') && !lower.endsWith('ss')) {
    return lower.slice(0, -1);
  }
  return lower;
}

const knownUnits = new Set([
  'tsp', 'teaspoon', 'tbsp', 'tablespoon', 'cup', 'fl', 'oz', 'ounce', 'lb', 'pound',
  'ml', 'l', 'g', 'gram', 'kg', 'kilo', 'clove', 'can', 'package', 'slice',
  'piece', 'pinch', 'head', 'bunch', 'sprig',
]);

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
