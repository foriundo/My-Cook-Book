const volumeUnits = {
  tsp: { us: 1, metric: 4.928 },
  tbsp: { us: 0.5, metric: 14.7868 },
  cup: { us: 8, metric: 240 },
  'fl oz': { us: 1, metric: 29.5735 },
  ml: { us: 0.033814, metric: 1 },
  l: { us: 33.814, metric: 1000 },
};

const weightUnits = {
  oz: { us: 1, metric: 28.3495 },
  lb: { us: 16, metric: 453.592 },
  g: { us: 0.035274, metric: 1 },
  kg: { us: 35.274, metric: 1000 },
};

export type UnitSystem = 'original' | 'us' | 'metric';

export function convertQuantity(quantity: number, unit: string, system: UnitSystem) {
  const normalizedUnit = normalizeUnit(unit);
  if (!normalizedUnit) return quantity;

  if (volumeUnits[normalizedUnit as keyof typeof volumeUnits]) {
    const reference = volumeUnits[normalizedUnit as keyof typeof volumeUnits];
    if (system === 'metric') return quantity * reference.metric;
    if (system === 'us') return quantity * reference.us;
  }

  if (weightUnits[normalizedUnit as keyof typeof weightUnits]) {
    const reference = weightUnits[normalizedUnit as keyof typeof weightUnits];
    if (system === 'metric') return quantity * reference.metric;
    if (system === 'us') return quantity * reference.us;
  }

  return quantity;
}

export function normalizeUnit(unit: string | null | undefined) {
  if (!unit) return null;
  const lower = unit.toLowerCase().trim();
  const aliases: Record<string, string> = {
    'fl oz': 'fl oz',
    'fl.oz': 'fl oz',
    oz: 'oz',
    ounce: 'oz',
    tbsp: 'tbsp',
    tablespoon: 'tbsp',
    tsp: 'tsp',
    teaspoon: 'tsp',
    cup: 'cup',
    cups: 'cup',
    l: 'l',
    litre: 'l',
    liter: 'l',
    ml: 'ml',
    g: 'g',
    gram: 'g',
    grams: 'g',
    kg: 'kg',
    kilo: 'kg',
    kilogram: 'kg',
    lb: 'lb',
    pound: 'lb',
  };

  return aliases[lower] ?? lower;
}
