import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { parseIngredientLine } from './ingredientParser';

export type ImportedRecipe = {
  title?: string;
  description?: string;
  baseServings?: number;
  tags?: string[];
  ingredients?: Array<{ quantity?: number | null; unit?: string | null; name: string; note?: string | null }>;
  steps?: Array<{ text: string }>;
  image?: string | null;
  sourceUrl?: string | null;
};

export async function importRecipeFromUrl(url: string): Promise<ImportedRecipe | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    let target = await validateImportUrl(url);
    let response: Response | undefined;

    for (let redirects = 0; redirects <= 5; redirects += 1) {
      response = await fetch(target, {
        signal: controller.signal,
        redirect: 'manual',
        headers: { 'User-Agent': 'MyCookBookImport/1.0' },
      });

      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get('location');
      if (!location || redirects === 5) throw new Error('The recipe URL redirected too many times.');
      target = await validateImportUrl(new URL(location, target).toString());
      await response.body?.cancel();
    }

    if (!response) throw new Error('Recipe fetch failed');
    if (!response.ok) {
      throw new Error('Recipe fetch failed');
    }

    const html = await readLimitedBody(response, controller.signal);
    const scriptMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const data = scriptMatches
      .map((match) => parseJsonCandidate(match[1]))
      .find(Boolean);

    if (!data) return null;

    return normalizeImportedRecipe(data, target.toString());
  } finally {
    clearTimeout(timeout);
  }
}

export async function validateImportUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Enter a valid recipe URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Only public HTTP or HTTPS recipe URLs are supported.');
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error('That URL is not supported for import.');
  }

  const ipVersion = isIP(hostname.replace(/^\[|\]$/g, ''));
  if (ipVersion) {
    if (!isPublicAddress(hostname.replace(/^\[|\]$/g, ''))) {
      throw new Error('That URL is not supported for import.');
    }
    return url;
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error('The recipe host could not be resolved.');
  }

  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error('That URL is not supported for import.');
  }

  return url;
}

async function readLimitedBody(response: Response, signal: AbortSignal) {
  const maxBytes = 2 * 1024 * 1024;
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error('The recipe page is larger than the 2 MB import limit.');
  }

  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let content = '';

  try {
    while (true) {
      if (signal.aborted) throw new Error('The recipe import timed out.');
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error('The recipe page is larger than the 2 MB import limit.');
      }
      content += decoder.decode(value, { stream: true });
    }
    return content + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [first, second] = address.split('.').map(Number);
    return !(first === 0 || first === 10 || first === 127 || first >= 224
      || (first === 100 && second >= 64 && second <= 127)
      || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 0)
      || (first === 192 && second === 168)
      || (first === 198 && (second === 18 || second === 19))
      || (first === 198 && second === 51)
      || (first === 203 && second === 0));
  }

  if (isIP(address) !== 6) return false;
  const normalized = address.toLowerCase();
  if (normalized.startsWith('::ffff:')) {
    const mappedV4 = normalized.slice('::ffff:'.length);
    return isIP(mappedV4) === 4 && isPublicAddress(mappedV4);
  }

  return (normalized.startsWith('2') || normalized.startsWith('3'))
    && !normalized.startsWith('2001:db8:')
    && !normalized.startsWith('2001:0:')
    && !normalized.startsWith('2002:');
}

function parseJsonCandidate(value: string): Record<string, unknown> | null {
  try {
    const json = JSON.parse(value);
    return typeof json === 'object' && json ? json as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function normalizeImportedRecipe(data: Record<string, unknown>, sourceUrl: string): ImportedRecipe | null {
  const entry = flattenJsonLd(data);
  if (!entry || typeof entry !== 'object') return null;

  const recipe = entry as Record<string, unknown>;
  const title = typeof recipe.name === 'string' ? recipe.name : 'Imported recipe';
  const description = typeof recipe.description === 'string' ? recipe.description : undefined;
  const yieldValue = recipe.recipeYield ?? recipe.servingSize;
  const baseServings = Number(String(yieldValue ?? '').match(/\d+(?:\.\d+)?/)?.[0] ?? 4) || 4;
  const tags = Array.isArray(recipe.keywords)
    ? recipe.keywords.flatMap((item) => typeof item === 'string' ? [item] : [])
    : [];

  const ingredientNodes = Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [];
  const ingredients = ingredientNodes
    .map((ingredient) => typeof ingredient === 'string' ? ingredient : '')
    .filter(Boolean)
    .map((line) => normalizeIngredientString(line));

  const stepNodes = Array.isArray(recipe.recipeInstructions) ? recipe.recipeInstructions : [];
  const steps = stepNodes
    .map((step) => {
      if (typeof step === 'string') return { text: step };
      if (typeof step === 'object' && step && 'text' in step && typeof (step as { text?: string }).text === 'string') {
        return { text: (step as { text: string }).text };
      }
      return null;
    })
    .filter((step): step is { text: string } => Boolean(step && step.text));

  return {
    title,
    description,
    baseServings: Number(baseServings),
    tags,
    ingredients: ingredients.length ? ingredients : [{ name: 'Imported ingredient' }],
    steps: steps.length ? steps : [{ text: 'Follow the original source instructions.' }],
    image: typeof recipe.image === 'string' ? recipe.image : undefined,
    sourceUrl,
  };
}

function flattenJsonLd(data: Record<string, unknown>): Record<string, unknown> | null {
  if (Array.isArray(data['@graph'])) {
    const candidate = data['@graph'].find((node) => {
      if (!node || typeof node !== 'object') return false;
      const record = node as Record<string, unknown>;
      return record['@type'] === 'Recipe' || (Array.isArray(record['@type']) && record['@type'].includes('Recipe'));
    });
    if (candidate && typeof candidate === 'object') return candidate as Record<string, unknown>;
  }

  if (data['@type'] === 'Recipe' || (Array.isArray(data['@type']) && data['@type'].includes('Recipe'))) {
    return data;
  }

  if (Array.isArray(data['itemListElement'])) {
    for (const item of data['itemListElement'] as unknown[]) {
      if (item && typeof item === 'object') {
        const nested = flattenJsonLd(item as Record<string, unknown>);
        if (nested) return nested;
      }
    }
  }

  return null;
}

function normalizeIngredientString(line: string) {
  const parsed = parseIngredientLine(line);
  return {
    quantity: parsed.quantity,
    unit: parsed.unit,
    name: parsed.name || line.trim() || 'Ingredient',
    note: parsed.note,
  };
}
