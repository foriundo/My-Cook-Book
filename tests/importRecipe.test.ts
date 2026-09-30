import { describe, expect, it } from 'vitest';
import { validateImportUrl } from '../lib/importRecipe';

describe('recipe importer URL validation', () => {
  it('rejects loopback and local hostnames', async () => {
    await expect(validateImportUrl('http://127.0.0.1/recipe')).rejects.toThrow();
    await expect(validateImportUrl('http://localhost/recipe')).rejects.toThrow();
    await expect(validateImportUrl('http://printer.local/recipe')).rejects.toThrow();
  });

  it('rejects non-http protocols and embedded credentials', async () => {
    await expect(validateImportUrl('file:///etc/passwd')).rejects.toThrow();
    await expect(validateImportUrl('https://user:pass@example.com/recipe')).rejects.toThrow();
  });

  it('rejects malformed URLs', async () => {
    await expect(validateImportUrl('not a URL')).rejects.toThrow();
  });
});