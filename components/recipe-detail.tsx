'use client';

import { useMemo, useState } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { scaleIngredient, formatFraction } from '@/lib/scaling';
import { convertQuantity } from '@/lib/units';
import { getVideoEmbedUrl } from '@/lib/video';
import { applyIngredientChanges, type IngredientChange } from '@/lib/modifications';

type FriendOption = { id: string; status: string; user: { id: string; name: string | null; email: string; username: string | null } };

export function RecipeDetail({ recipe, isOwner, isLoggedIn = false }: { recipe: { id: string; ownerId: string; title: string; description?: string | null; coverImageUrl?: string | null; coverImageAlt?: string | null; images?: { id: string; url: string; caption: string | null }[]; forkedFrom?: { id: string; title: string; owner: { name: string | null; username: string | null } } | null; baseServings: number; ingredients: { id: string; name: string; quantity: number | null; unit: string | null; scalable: boolean; note?: string | null }[]; steps: { id: string; text: string; timerSeconds?: number | null }[]; caloriesPerServing?: number | null; proteinG?: number | null; carbsG?: number | null; fatG?: number | null; videoUrl?: string | null; sourceUrl?: string | null; visibility?: string | null; shareSlug?: string | null; prepMinutes?: number | null; cookMinutes?: number | null; ratings?: { userId: string; stars: number; review?: string | null; wouldMakeAgain?: boolean | null; createdAt: Date }[]; modifications?: { id: string; title: string; notes?: string | null; ingredientChanges: string; servings: number | null; isDefault: boolean }[]; cookLogs?: { id: string; servings: number; note: string | null; cookedAt: Date; user: { name: string | null; username: string | null } }[]; }; isOwner: boolean; isLoggedIn?: boolean }) {
  const router = useRouter();
  const [servings, setServings] = useState(() => recipe.modifications?.find((modification) => modification.isDefault)?.servings ?? recipe.baseServings);
  const [unitSystem, setUnitSystem] = useState<'original' | 'us' | 'metric'>('original');
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [modTitle, setModTitle] = useState('');
  const [modNotes, setModNotes] = useState('');
  const [modDefault, setModDefault] = useState(false);
  const [selectedModificationId, setSelectedModificationId] = useState(() => recipe.modifications?.find((modification) => modification.isDefault)?.id ?? '');
  const [removeIngredientIds, setRemoveIngredientIds] = useState<string[]>([]);
  const [changedQuantities, setChangedQuantities] = useState<Record<string, string>>({});
  const [addedIngredientName, setAddedIngredientName] = useState('');
  const [addedIngredientQuantity, setAddedIngredientQuantity] = useState('');
  const [addedIngredientUnit, setAddedIngredientUnit] = useState('');
  const [wouldMakeAgain, setWouldMakeAgain] = useState(true);
  const [actionError, setActionError] = useState('');
  const [showFriendShare, setShowFriendShare] = useState(false);
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [shareMessage, setShareMessage] = useState('');
  const [cookNote, setCookNote] = useState('');

  useEffect(() => {
    if (!showFriendShare || friends.length) return;
    void fetch('/api/friends').then(async (response) => {
      if (response.ok) setFriends((await response.json()).filter((friend: FriendOption) => friend.status === 'ACCEPTED'));
    });
  }, [showFriendShare, friends.length]);

  const selectedModification = recipe.modifications?.find((modification) => modification.id === selectedModificationId);
  const selectedChanges = useMemo(() => {
    try {
      return selectedModification ? JSON.parse(selectedModification.ingredientChanges) as IngredientChange[] : [];
    } catch {
      return [];
    }
  }, [selectedModification]);
  const ingredientRows = useMemo(() => applyIngredientChanges(recipe.ingredients, selectedChanges).map((ingredient) => {
    let quantity = ingredient.quantity ?? 0;
    const scaleBase = ingredient.changeType === 'changed' || ingredient.changeType === 'added'
      ? selectedModification?.servings ?? recipe.baseServings
      : recipe.baseServings;
    if (ingredient.scalable !== false) quantity = scaleIngredient(quantity, scaleBase, servings);
    if (ingredient.unit && unitSystem !== 'original') quantity = convertQuantity(quantity, ingredient.unit, unitSystem === 'us' ? 'us' : 'metric');
    return { ...ingredient, displayQuantity: quantity };
  }), [recipe.ingredients, selectedChanges, selectedModification, recipe.baseServings, servings, unitSystem]);

  const publicRatings = recipe.ratings?.filter((item) => item.userId !== recipe.ownerId) ?? [];
  const avgRating = publicRatings.length ? publicRatings.reduce((total, item) => total + item.stars, 0) / publicRatings.length : 0;
  const wouldMakeAgainRatings = publicRatings.filter((item) => item.wouldMakeAgain !== null);
  const wouldMakeAgainPercent = wouldMakeAgainRatings.length
    ? Math.round(wouldMakeAgainRatings.filter((item) => item.wouldMakeAgain).length / wouldMakeAgainRatings.length * 100)
    : null;
  const batchCalories = recipe.caloriesPerServing ? Math.round(recipe.caloriesPerServing * servings) : null;
  const macroCalories = (recipe.proteinG ?? 0) * 4 + (recipe.carbsG ?? 0) * 4 + (recipe.fatG ?? 0) * 9;
  const embedUrl = recipe.videoUrl ? getVideoEmbedUrl(recipe.videoUrl) : null;

  const submitRating = async () => {
    const response = await fetch(`/api/recipes/${recipe.id}/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stars: rating, review, wouldMakeAgain }),
    });
    if (!response.ok) {
      const data = await response.json();
      setActionError(data.error ?? 'Could not save your rating.');
      return;
    }
    setActionError('');
    router.refresh();
  };

  const submitModification = async () => {
    const changes: IngredientChange[] = [
      ...removeIngredientIds.map((ingredientId) => ({ action: 'remove' as const, ingredientId })),
      ...Object.entries(changedQuantities)
        .filter(([ingredientId, value]) => value.trim() && !removeIngredientIds.includes(ingredientId))
        .map(([ingredientId, value]) => ({ action: 'change' as const, ingredientId, quantity: Number(value) })),
      ...(addedIngredientName.trim() ? [{ action: 'add' as const, name: addedIngredientName.trim(), quantity: addedIngredientQuantity ? Number(addedIngredientQuantity) : null, unit: addedIngredientUnit || null }] : []),
    ];
    const response = await fetch(`/api/recipes/${recipe.id}/modifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: modTitle || 'My variation', notes: modNotes, ingredientChanges: changes, servings, isDefault: modDefault }),
    });
    if (!response.ok) {
      const data = await response.json();
      setActionError(data.error ?? 'Could not save your modification.');
      return;
    }
    const saved = await response.json();
    setSelectedModificationId(saved.id);
    setRemoveIngredientIds([]);
    setChangedQuantities({});
    setAddedIngredientName('');
    setAddedIngredientQuantity('');
    setAddedIngredientUnit('');
    setActionError('');
    router.refresh();
  };

  const setDefaultModification = async () => {
    if (!selectedModification) return;
    const response = await fetch(`/api/recipes/${recipe.id}/modifications`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modificationId: selectedModification.id, isDefault: true }),
    });
    if (!response.ok) {
      setActionError('Could not set the default modification.');
      return;
    }
    router.refresh();
  };

  const saveToCookbook = async () => {
    const response = await fetch(`/api/recipes/${recipe.id}/fork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modificationId: selectedModification?.id }),
    });
    if (!response.ok) {
      const data = await response.json();
      setActionError(data.error ?? 'Could not save this recipe.');
      return;
    }
    router.push('/recipes');
  };

  const shareRecipe = async () => {
    if (!recipe.shareSlug) return;
    const url = `${window.location.origin}/r/${recipe.shareSlug}`;
    try {
      if (navigator.share) await navigator.share({ title: recipe.title, url });
      else await navigator.clipboard.writeText(url);
      setActionError('');
    } catch {
      setActionError('Could not share the recipe link.');
    }
  };

  const sendToFriends = async () => {
    const response = await fetch(`/api/recipes/${recipe.id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientIds: selectedFriendIds, message: shareMessage }),
    });
    const data = await response.json();
    if (!response.ok) {
      setActionError(data.error ?? 'Could not share with those friends.');
      return;
    }
    setActionError('Recipe shared.');
    setShowFriendShare(false);
    setSelectedFriendIds([]);
    setShareMessage('');
  };

  const logCook = async () => {
    const response = await fetch(`/api/recipes/${recipe.id}/cook-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ servings, note: cookNote || null }),
    });
    const data = await response.json();
    if (!response.ok) {
      setActionError(data.error ?? 'Could not log this cook.');
      return;
    }
    setCookNote('');
    setActionError('Cook logged.');
    router.refresh();
  };

  const deleteRecipe = async () => {
    if (!window.confirm(`Delete “${recipe.title}” permanently?`)) return;
    const response = await fetch(`/api/recipes/${recipe.id}`, { method: 'DELETE' });
    if (!response.ok) {
      setActionError('Could not delete this recipe.');
      return;
    }
    router.push('/recipes');
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-2xl bg-white p-6 shadow-soft">
        {(recipe.coverImageUrl || recipe.images?.length) && (
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {recipe.coverImageUrl && <Image src={recipe.coverImageUrl} alt={recipe.coverImageAlt || recipe.title} width={1200} height={750} unoptimized className="h-64 w-full rounded-xl object-cover sm:col-span-2" />}
            {recipe.images?.map((image) => <Image key={image.id} src={image.url} alt={image.caption || recipe.title} width={600} height={400} unoptimized className="h-40 w-full rounded-lg object-cover" />)}
          </div>
        )}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{recipe.title}</h1>
            {recipe.description && <p className="mt-2 text-slate-600">{recipe.description}</p>}
            {recipe.forkedFrom && <p className="mt-2 text-sm text-slate-500">Remixed from {recipe.forkedFrom.title} by {recipe.forkedFrom.owner.username ? `@${recipe.forkedFrom.owner.username}` : recipe.forkedFrom.owner.name ?? 'another cook'}</p>}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => router.push(`/recipes/${recipe.id}/cook`)} className="rounded-lg bg-orange-600 px-3 py-2 text-sm text-white">Cook mode</button>
            {isOwner && <button type="button" onClick={() => router.push(`/recipes/${recipe.id}/edit`)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">Edit</button>}
            {isOwner && <button type="button" onClick={deleteRecipe} className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-700">Delete</button>}
            {isLoggedIn && <button type="button" onClick={saveToCookbook} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">Save as my own</button>}
            {recipe.shareSlug && <button type="button" onClick={shareRecipe} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">Share link</button>}
            {isLoggedIn && <button type="button" onClick={() => setShowFriendShare((shown) => !shown)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">Share with friends</button>}
          </div>
        </div>

        {showFriendShare && (
          <div className="mb-6 max-w-xl border-y border-slate-200 py-4">
            <h2 className="font-semibold text-slate-900">Share with accepted friends</h2>
            {friends.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {friends.map((friend) => (
                  <label key={friend.id} className="flex items-center gap-2 rounded-md border border-slate-200 p-2 text-sm text-slate-700">
                    <input type="checkbox" checked={selectedFriendIds.includes(friend.user.id)} onChange={(event) => setSelectedFriendIds((selected) => event.target.checked ? [...selected, friend.user.id] : selected.filter((id) => id !== friend.user.id))} />
                    {friend.user.name ?? friend.user.username ?? friend.user.email}
                  </label>
                ))}
              </div>
            ) : <p className="mt-2 text-sm text-slate-600">No accepted friends available.</p>}
            <input value={shareMessage} onChange={(event) => setShareMessage(event.target.value)} placeholder="Add a message (optional)" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button type="button" disabled={!selectedFriendIds.length} onClick={sendToFriends} className="mt-3 rounded-lg bg-orange-600 px-3 py-2 text-sm text-white disabled:opacity-50">Send recipe</button>
          </div>
        )}

        <div className="mb-8 flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white px-2">
            <button type="button" onClick={() => setServings((value) => Math.max(1, value - 1))} className="h-8 w-8 text-xl text-slate-700">−</button>
            <input type="number" min={1} max={100} value={servings} onChange={(e) => setServings(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} className="w-16 border-0 bg-transparent text-center text-lg font-semibold outline-none" />
            <button type="button" onClick={() => setServings((value) => Math.min(100, value + 1))} className="h-8 w-8 text-xl text-slate-700">+</button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm">
            {['original', 'us', 'metric'].map((system) => (
              <button key={system} type="button" onClick={() => setUnitSystem(system as 'original' | 'us' | 'metric')} className={`rounded-md px-3 py-1 ${unitSystem === system ? 'bg-white shadow' : 'text-slate-600'}`}>
                {system === 'original' ? 'Original' : system === 'us' ? 'US' : 'Metric'}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
            {recipe.caloriesPerServing ? `${recipe.caloriesPerServing} cal / serving · ${batchCalories} batch` : 'Nutrition not set'}
          </div>
          <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">⭐ {avgRating ? avgRating.toFixed(1) : 'No ratings'} · {publicRatings.length}</div>
          {wouldMakeAgainPercent !== null && <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">{wouldMakeAgainPercent}% would make again</div>}
        </div>

        <div className="grid gap-8 md:grid-cols-[1.1fr_2fr]">
          <aside className="space-y-6">
            <div className="rounded-2xl bg-slate-50 p-4">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Ingredients</h2>
              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-600">Ingredient version</label>
                <select value={selectedModificationId} onChange={(event) => {
                  const id = event.target.value;
                  setSelectedModificationId(id);
                  const selected = recipe.modifications?.find((modification) => modification.id === id);
                  if (selected?.servings) setServings(selected.servings);
                }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="">Original</option>
                  {recipe.modifications?.map((modification) => <option key={modification.id} value={modification.id}>{modification.title}{modification.isDefault ? ' · default' : ''}</option>)}
                </select>
                {selectedModification && !selectedModification.isDefault && <button type="button" onClick={setDefaultModification} className="mt-2 text-xs text-orange-700 underline">Make this my default</button>}
              </div>
              <ul className="space-y-2">
                {ingredientRows.map((ingredient) => (
                  <li key={ingredient.id} className={`flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ${ingredient.changeType === 'removed' ? 'text-slate-400 line-through' : ingredient.changeType === 'changed' ? 'border-amber-300 bg-amber-50' : ingredient.changeType === 'added' ? 'border-emerald-300 bg-emerald-50' : ''}`}>
                    <div>
                      <span className="font-medium text-slate-800">{ingredient.name}</span>
                      {ingredient.note && <span className="ml-1 text-slate-500">{ingredient.note}</span>}
                      {ingredient.changeType === 'added' && <span className="ml-2 text-xs font-medium text-emerald-700">+ added</span>}
                      {ingredient.changeType === 'changed' && <span className="ml-2 text-xs font-medium text-amber-700">changed</span>}
                    </div>
                    <span className="whitespace-nowrap text-slate-700">
                      {ingredient.quantity ? `${formatFraction(ingredient.displayQuantity)} ${ingredient.unit ?? ''}`.trim() : ingredient.unit ?? 'to taste'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {macroCalories > 0 && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <h2 className="mb-2 text-lg font-semibold text-slate-900">Nutrition per serving</h2>
                <p className="text-sm text-slate-700">Protein {recipe.proteinG ?? 0} g · Carbs {recipe.carbsG ?? 0} g · Fat {recipe.fatG ?? 0} g</p>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-200" aria-label="Macronutrient calorie distribution">
                  <div className="bg-emerald-600" style={{ width: `${(recipe.proteinG ?? 0) * 4 / macroCalories * 100}%` }} />
                  <div className="bg-amber-500" style={{ width: `${(recipe.carbsG ?? 0) * 4 / macroCalories * 100}%` }} />
                  <div className="bg-rose-500" style={{ width: `${(recipe.fatG ?? 0) * 9 / macroCalories * 100}%` }} />
                </div>
              </div>
            )}

            {isLoggedIn && <div className="rounded-2xl bg-slate-50 p-4">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Save a modification</h2>
              <input value={modTitle} onChange={(e) => setModTitle(e.target.value)} placeholder="Less sugar, added cinnamon" className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <textarea value={modNotes} onChange={(e) => setModNotes(e.target.value)} placeholder="Notes for this variation" className="mb-2 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <p className="mb-2 text-xs font-medium text-slate-600">Change an amount, remove an ingredient, or add one.</p>
              <ul className="space-y-2">
                {recipe.ingredients.map((ingredient) => (
                  <li key={ingredient.id} className="grid grid-cols-[1fr_90px_auto] items-center gap-2 text-sm">
                    <span className="truncate text-slate-700">{ingredient.name}</span>
                    <input type="number" min="0.01" step="any" aria-label={`New quantity for ${ingredient.name}`} placeholder={ingredient.quantity == null ? 'qty' : String(ingredient.quantity)} value={changedQuantities[ingredient.id] ?? ''} onChange={(event) => setChangedQuantities((current) => ({ ...current, [ingredient.id]: event.target.value }))} className="w-full rounded-md border border-slate-300 px-2 py-1" />
                    <label className="flex items-center gap-1 text-xs text-slate-600"><input type="checkbox" checked={removeIngredientIds.includes(ingredient.id)} onChange={(event) => setRemoveIngredientIds((current) => event.target.checked ? [...current, ingredient.id] : current.filter((id) => id !== ingredient.id))} />Remove</label>
                  </li>
                ))}
              </ul>
              <div className="mt-3 grid grid-cols-[1fr_70px_80px] gap-2">
                <input value={addedIngredientName} onChange={(event) => setAddedIngredientName(event.target.value)} placeholder="New ingredient" className="min-w-0 rounded-md border border-slate-300 px-2 py-2 text-sm" />
                <input type="number" min="0.01" step="any" value={addedIngredientQuantity} onChange={(event) => setAddedIngredientQuantity(event.target.value)} placeholder="Qty" className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm" />
                <input value={addedIngredientUnit} onChange={(event) => setAddedIngredientUnit(event.target.value)} placeholder="Unit" className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm" />
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modDefault} onChange={(event) => setModDefault(event.target.checked)} />Make default</label>
              <button type="button" onClick={submitModification} className="rounded-lg bg-orange-600 px-3 py-2 text-sm text-white">Save modification</button>
            </div>}
          </aside>

          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-50 p-4">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Steps</h2>
              <ol className="space-y-3">
                {recipe.steps.map((step, index) => (
                  <li key={step.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-700">{index + 1}</span>
                    {step.text}
                  </li>
                ))}
              </ol>
            </div>

            {isLoggedIn && <div className="rounded-2xl bg-slate-50 p-4">
              <h2 className="text-lg font-semibold text-slate-900">I made it</h2>
              <p className="mt-1 text-sm text-slate-600">Cooked {recipe.cookLogs?.length ?? 0} times</p>
              <textarea value={cookNote} onChange={(event) => setCookNote(event.target.value)} placeholder="How did it go?" className="mt-3 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button type="button" onClick={logCook} className="mt-3 rounded-lg bg-orange-700 px-3 py-2 text-sm text-white">Log this cook</button>
              {!!recipe.cookLogs?.length && <ul className="mt-4 space-y-2">{recipe.cookLogs.slice(0, 5).map((log) => <li key={log.id} className="border-t border-slate-200 pt-2 text-sm text-slate-600">{log.user.name ?? (log.user.username ? `@${log.user.username}` : 'Cooked')} · {log.servings} servings · {new Date(log.cookedAt).toLocaleDateString()}{log.note ? ` · ${log.note}` : ''}</li>)}</ul>}
            </div>}

            {embedUrl && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">Video</h2>
                <div className="aspect-video overflow-hidden rounded-xl bg-slate-200">
                  <iframe src={embedUrl} className="h-full w-full" loading="lazy" allowFullScreen />
                </div>
              </div>
            )}

            {isLoggedIn && <div className="rounded-2xl bg-slate-50 p-4">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Rate this recipe</h2>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => setRating(value)} className={`text-2xl ${value <= rating ? 'text-amber-500' : 'text-slate-300'}`}>★</button>
                ))}
              </div>
              <textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="Tell us what you loved or changed" className="mt-3 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={wouldMakeAgain} onChange={(e) => setWouldMakeAgain(e.target.checked)} />
                Would make again
              </label>
              <button type="button" onClick={submitRating} className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">Submit rating</button>
              <ul className="mt-4 space-y-3">
                {recipe.ratings?.filter((item) => item.review && item.userId !== recipe.ownerId).map((item, index) => (
                  <li key={`${item.userId}-${index}`} className="border-t border-slate-200 pt-3 text-sm text-slate-700">
                    <p className="font-medium">{'★'.repeat(item.stars)}{'☆'.repeat(5 - item.stars)}</p>
                    <p className="mt-1">{item.review}</p>
                  </li>
                ))}
              </ul>
            </div>}
          </div>
        </div>
      </div>
      {recipe.sourceUrl && <p className="mt-3 text-sm text-slate-600">Source: <a href={recipe.sourceUrl} rel="noreferrer" target="_blank" className="underline">{new URL(recipe.sourceUrl).hostname}</a></p>}
      {actionError && <p role="status" className="mt-3 text-sm text-red-600">{actionError}</p>}
    </div>
  );
}
