'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { parseIngredientLine } from '@/lib/ingredientParser';
import { parseTimerSeconds } from '@/lib/timeParser';

export function RecipeForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseServings, setBaseServings] = useState(4);
  const [prepMinutes, setPrepMinutes] = useState('');
  const [cookMinutes, setCookMinutes] = useState('');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [cuisine, setCuisine] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [visibility, setVisibility] = useState('PRIVATE');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverImageAlt, setCoverImageAlt] = useState('');
  const [galleryImages, setGalleryImages] = useState<Array<{ url: string; caption: string }>>([]);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ingredients, setIngredients] = useState('2 cups flour\n1 tsp salt\n2 eggs');
  const [steps, setSteps] = useState('Mix dry ingredients\nBake for 20 minutes');
  const [tags, setTags] = useState('quick, family');
  const [error, setError] = useState('');

  async function handleImport() {
    if (!importUrl.trim()) return;
    setImporting(true);
    setError('');

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      });

      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? 'Could not import recipe');
        return;
      }

      if (json.title) setTitle(json.title);
      if (json.description) setDescription(json.description);
      if (json.baseServings) setBaseServings(Number(json.baseServings));
      if (json.sourceUrl) setSourceUrl(json.sourceUrl);
        if (json.image) {
          const imageUrl = typeof json.image === 'string' ? json.image : Array.isArray(json.image) ? json.image[0] : json.image.url;
          if (typeof imageUrl === 'string') {
            setCoverImageUrl(imageUrl);
            setCoverImageAlt(json.title ?? 'Imported recipe');
          }
        }
      if (Array.isArray(json.tags) && json.tags.length > 0) setTags(json.tags.join(', '));
      if (Array.isArray(json.ingredients) && json.ingredients.length > 0) {
        setIngredients(json.ingredients.map((ingredient: { quantity?: number | null; unit?: string | null; name: string; note?: string | null }) => {
          const parts = [ingredient.quantity ?? '', ingredient.unit ?? '', ingredient.name].filter(Boolean);
          if (ingredient.note) parts.push(`, ${ingredient.note}`);
          return parts.join(' ').trim();
        }).join('\n'));
      }
      if (Array.isArray(json.steps) && json.steps.length > 0) {
        setSteps(json.steps.map((step: { text?: string }) => step.text ?? '').filter(Boolean).join('\n'));
      }
    } catch {
      setError('Could not import that recipe URL.');
    } finally {
      setImporting(false);
    }
  }

  async function uploadImage(file: File) {
    const form = new FormData();
    form.set('file', file);
    const response = await fetch('/api/upload', { method: 'POST', body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Image upload failed.');
    return data.url as string;
  }

  async function handleCoverUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      setCoverImageUrl(await uploadImage(file));
      setCoverImageAlt(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleGalleryUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    if (galleryImages.length + files.length > 10) {
      setError('Choose no more than 10 gallery images.');
      event.target.value = '';
      return;
    }
    setUploading(true);
    setError('');
    try {
      const images = await Promise.all(files.map(async (file) => ({
        url: await uploadImage(file),
        caption: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
      })));
      setGalleryImages((current) => [...current, ...images]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      title,
      description,
      baseServings,
      prepMinutes: optionalNumber(prepMinutes),
      cookMinutes: optionalNumber(cookMinutes),
      difficulty,
      cuisine: cuisine || null,
      caloriesPerServing: optionalNumber(calories),
      proteinG: optionalNumber(protein),
      carbsG: optionalNumber(carbs),
      fatG: optionalNumber(fat),
      sourceUrl: sourceUrl || null,
      videoUrl: videoUrl || null,
      coverImageUrl: coverImageUrl || null,
      coverImageAlt: coverImageAlt || null,
      images: galleryImages,
      visibility,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      ingredients: ingredients.split('\n').map((line) => parseIngredientLine(line)).filter((ingredient) => ingredient.name).map((ingredient) => ({
        ...ingredient,
        scalable: ingredient.quantity !== null,
      })),
      steps: steps.split('\n').map((line) => line.trim()).filter(Boolean).map((text) => ({ text, timerSeconds: parseTimerSeconds(text) })),
    };

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? 'Could not save');
        return;
      }

      router.push('/recipes');
      router.refresh();
    } catch {
      setError('Unable to save the recipe right now.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 rounded-xl border border-dashed border-orange-200 bg-orange-50 p-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Import from URL (recipe JSON-LD)</span>
            <div className="flex gap-2">
              <input value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://example.com/recipe" className="flex-1 rounded-lg border border-slate-300 px-3 py-2" />
              <button type="button" onClick={handleImport} disabled={importing} className="rounded-lg bg-orange-600 px-4 py-2 text-sm text-white disabled:opacity-60">
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </label>
        </div>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-slate-700">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" required />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-slate-700">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Base servings</span>
          <input type="number" min={1} value={baseServings} onChange={(e) => setBaseServings(Number(e.target.value) || 1)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Tags</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Cuisine</span>
          <input value={cuisine} onChange={(e) => setCuisine(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Difficulty</span>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Prep minutes</span>
          <input type="number" min={0} value={prepMinutes} onChange={(e) => setPrepMinutes(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Cook minutes</span>
          <input type="number" min={0} value={cookMinutes} onChange={(e) => setCookMinutes(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Calories per serving</span>
          <input type="number" min={0} value={calories} onChange={(e) => setCalories(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Protein (g)</span>
          <input type="number" min={0} step="0.1" value={protein} onChange={(e) => setProtein(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Carbs (g)</span>
          <input type="number" min={0} step="0.1" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Fat (g)</span>
          <input type="number" min={0} step="0.1" value={fat} onChange={(e) => setFat(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Visibility</span>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="PRIVATE">Private</option><option value="FRIENDS">Friends</option><option value="UNLISTED">Unlisted</option><option value="PUBLIC">Public</option>
          </select>
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-slate-700">Source URL</span>
          <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-slate-700">Video URL</span>
          <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Cover image</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverUpload} className="w-full text-sm" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Cover image alt text</span>
          <input value={coverImageAlt} onChange={(event) => setCoverImageAlt(event.target.value)} required={Boolean(coverImageUrl)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        {coverImageUrl && <Image src={coverImageUrl} alt={coverImageAlt} width={800} height={500} className="h-40 w-full rounded-lg object-cover md:col-span-2" />}
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-slate-700">Gallery images (up to 10)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleGalleryUpload} className="w-full text-sm" />
          <span className="mt-1 block text-xs text-slate-500">{galleryImages.length}/10 uploaded · {uploading ? 'Uploading...' : 'JPG, PNG, or WebP up to 5 MB each'}</span>
        </label>
        {galleryImages.map((image, index) => (
          <div key={image.url} className="flex items-start gap-3 md:col-span-2">
            <Image src={image.url} alt={image.caption} width={120} height={90} className="h-20 w-28 rounded-md object-cover" />
            <input aria-label={`Gallery image ${index + 1} alt text`} value={image.caption} onChange={(event) => setGalleryImages((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, caption: event.target.value } : item))} required className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button type="button" onClick={() => setGalleryImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-sm text-slate-600 underline">Remove</button>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Ingredients (one per line)</span>
          <textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} className="min-h-40 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Steps (one per line)</span>
          <textarea value={steps} onChange={(e) => setSteps(e.target.value)} className="min-h-40 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push('/recipes')}>Cancel</Button>
        <Button type="submit" disabled={saving || uploading}>{saving ? 'Saving...' : 'Save recipe'}</Button>
      </div>
    </form>
  );
}

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
