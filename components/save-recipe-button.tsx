'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SaveRecipeButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function saveRecipe() {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/recipes/${recipeId}/fork`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Could not save this recipe.');
        return;
      }
      router.push(`/recipes/${data.id}`);
    } catch {
      setError('Could not save this recipe right now.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={saveRecipe} disabled={saving} className="mt-6 rounded-lg bg-orange-600 px-4 py-2 text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save to my cookbook'}</button>
      {error && <p role="status" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}