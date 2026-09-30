'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type CollectionData = { id: string; name: string; emoji: string | null; recipes: Array<{ recipe: { id: string; title: string; description: string | null } }> };
type RecipeOption = { id: string; title: string };

export function CollectionDetailPanel({ collectionId }: { collectionId: string }) {
  const [collection, setCollection] = useState<CollectionData | null>(null);
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [recipeId, setRecipeId] = useState('');
  const [error, setError] = useState('');

  async function loadCollection() {
    const response = await fetch(`/api/collections/${collectionId}`);
    const data = await response.json();
    if (response.ok) setCollection(data);
    else setError(data.error ?? 'Could not load collection.');
  }

  useEffect(() => {
    void Promise.all([fetch(`/api/collections/${collectionId}`), fetch('/api/recipes')]).then(async ([collectionResponse, recipeResponse]) => {
      if (collectionResponse.ok) setCollection(await collectionResponse.json());
      else setError('Could not load collection.');
      if (recipeResponse.ok) setRecipes(await recipeResponse.json());
    });
  }, [collectionId]);

  async function addRecipe(event: React.FormEvent) {
    event.preventDefault();
    if (!recipeId) return;
    const response = await fetch(`/api/collections/${collectionId}/recipes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipeId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? 'Could not add recipe.');
      return;
    }
    setRecipeId('');
    setError('');
    await loadCollection();
  }

  async function removeRecipe(id: string) {
    const response = await fetch(`/api/collections/${collectionId}/recipes?recipeId=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (response.ok) await loadCollection();
  }

  if (!collection) return <p className="mt-6 text-slate-600">{error || 'Loading collection...'}</p>;

  const recipeIds = new Set(collection.recipes.map((item) => item.recipe.id));
  return (
    <div className="mt-6 max-w-4xl">
      <form onSubmit={addRecipe} className="flex gap-2 border-b border-slate-200 pb-5">
        <select aria-label="Recipe to add" value={recipeId} onChange={(event) => setRecipeId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2">
          <option value="">Choose a recipe</option>
          {recipes.filter((recipe) => !recipeIds.has(recipe.id)).map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.title}</option>)}
        </select>
        <button type="submit" disabled={!recipeId} className="rounded-lg bg-orange-600 px-4 py-2 text-sm text-white disabled:opacity-50">Add recipe</button>
      </form>
      {error && <p role="status" className="mt-3 text-sm text-red-600">{error}</p>}
      {!collection.recipes.length ? <p className="mt-5 text-slate-600">No recipes in this collection.</p> : (
        <ul className="divide-y divide-slate-200">
          {collection.recipes.map(({ recipe }) => (
            <li key={recipe.id} className="flex items-center justify-between gap-4 py-4">
              <Link href={`/recipes/${recipe.id}`} className="min-w-0">
                <span className="font-medium text-slate-900">{recipe.title}</span>
                {recipe.description && <span className="ml-2 text-sm text-slate-600">{recipe.description}</span>}
              </Link>
              <button type="button" onClick={() => removeRecipe(recipe.id)} className="text-sm text-slate-600 underline">Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}