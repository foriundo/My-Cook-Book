'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { parseIngredientLine } from '@/lib/ingredientParser';
import { parseTimerSeconds } from '@/lib/timeParser';

export default function EditRecipePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseServings, setBaseServings] = useState(4);
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [tags, setTags] = useState('');
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
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadRecipe() {
      const response = await fetch(`/api/recipes/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Unable to load this recipe.');
        setLoading(false);
        return;
      }

      setTitle(data.title ?? '');
      setDescription(data.description ?? '');
      setBaseServings(Number(data.baseServings ?? 4));
      setIngredients((data.ingredients ?? []).map((item: { quantity?: number | null; unit?: string | null; name: string; note?: string | null }) => {
        const amount = item.quantity == null ? '' : String(item.quantity);
        const text = [amount, item.unit ?? '', item.name].filter(Boolean).join(' ');
        return item.note ? `${text}, ${item.note}` : text;
      }).join('\n'));
      setSteps((data.steps ?? []).map((step: { text: string }) => step.text).join('\n'));
      setTags(JSON.parse(data.tags || '[]').join(', '));
      setPrepMinutes(data.prepMinutes == null ? '' : String(data.prepMinutes));
      setCookMinutes(data.cookMinutes == null ? '' : String(data.cookMinutes));
      setDifficulty(data.difficulty ?? 'MEDIUM');
      setCuisine(data.cuisine ?? '');
      setCalories(data.caloriesPerServing == null ? '' : String(data.caloriesPerServing));
      setProtein(data.proteinG == null ? '' : String(data.proteinG));
      setCarbs(data.carbsG == null ? '' : String(data.carbsG));
      setFat(data.fatG == null ? '' : String(data.fatG));
      setSourceUrl(data.sourceUrl ?? '');
      setVideoUrl(data.videoUrl ?? '');
      setVisibility(data.visibility ?? 'PRIVATE');
      setCoverImageUrl(data.coverImageUrl ?? '');
      setCoverImageAlt(data.coverImageAlt ?? '');
      setGalleryImages((data.images ?? []).map((image: { url: string; caption: string | null }) => ({ url: image.url, caption: image.caption ?? '' })));
      setLoading(false);
    }

    if (params.id) {
      void loadRecipe();
    }
  }, [params.id]);

  async function uploadImages(files: File[]) {
    const uploads = await Promise.all(files.map(async (file) => {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Image upload failed.');
      return { url: data.url as string, caption: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') };
    }));
    return uploads;
  }

  async function handleCoverUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const [image] = await uploadImages([file]);
      setCoverImageUrl(image.url);
      setCoverImageAlt(image.caption);
      setError('');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleGalleryUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (galleryImages.length + files.length > 10) {
      setError('Choose no more than 10 gallery images.');
      event.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadImages(files);
      setGalleryImages((current) => [...current, ...uploaded]);
      setError('');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/recipes/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          visibility,
          coverImageUrl: coverImageUrl || null,
          coverImageAlt: coverImageAlt || null,
          images: galleryImages,
          tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          ingredients: ingredients.split('\n').map((line) => parseIngredientLine(line)).filter((item) => item.name).map((item) => ({ ...item, scalable: item.quantity !== null })),
          steps: steps.split('\n').map((line) => line.trim()).filter(Boolean).map((text) => ({ text, timerSeconds: parseTimerSeconds(text) })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Could not save changes.');
        return;
      }

      router.push(`/recipes/${params.id}`);
    } catch {
      setError('Unable to save the recipe right now.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-slate-600">Loading recipe…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-bold text-slate-900">Edit recipe</h1>
      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" required />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Base servings</span>
          <input type="number" min={1} value={baseServings} onChange={(e) => setBaseServings(Number(e.target.value) || 1)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Ingredients (one per line)</span>
            <textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} className="min-h-48 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Steps (one per line)</span>
            <textarea value={steps} onChange={(e) => setSteps(e.target.value)} className="min-h-48 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tags" value={tags} onChange={setTags} />
          <Field label="Cuisine" value={cuisine} onChange={setCuisine} />
          <Field label="Prep minutes" value={prepMinutes} onChange={setPrepMinutes} type="number" />
          <Field label="Cook minutes" value={cookMinutes} onChange={setCookMinutes} type="number" />
          <Field label="Calories per serving" value={calories} onChange={setCalories} type="number" />
          <Field label="Protein (g)" value={protein} onChange={setProtein} type="number" />
          <Field label="Carbs (g)" value={carbs} onChange={setCarbs} type="number" />
          <Field label="Fat (g)" value={fat} onChange={setFat} type="number" />
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Difficulty</span>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Visibility</span>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="PRIVATE">Private</option><option value="FRIENDS">Friends</option><option value="UNLISTED">Unlisted</option><option value="PUBLIC">Public</option>
            </select>
          </label>
          <Field label="Source URL" value={sourceUrl} onChange={setSourceUrl} type="url" />
          <Field label="Video URL" value={videoUrl} onChange={setVideoUrl} type="url" />
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Cover image</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverUpload} className="w-full text-sm" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Cover image alt text</span>
            <input value={coverImageAlt} onChange={(event) => setCoverImageAlt(event.target.value)} required={Boolean(coverImageUrl)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          {coverImageUrl.startsWith('/uploads/') && <Image src={coverImageUrl} alt={coverImageAlt} width={800} height={500} className="h-40 w-full rounded-lg object-cover md:col-span-2" />}
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-slate-700">Gallery images (up to 10)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleGalleryUpload} className="w-full text-sm" />
            <span className="mt-1 block text-xs text-slate-500">{galleryImages.length}/10 uploaded · {uploading ? 'Uploading...' : 'JPG, PNG, or WebP up to 5 MB each'}</span>
          </label>
          {galleryImages.map((image, index) => (
            <div key={`${image.url}-${index}`} className="flex items-start gap-3 md:col-span-2">
              <Image src={image.url} alt={image.caption} width={120} height={90} className="h-20 w-28 rounded-md object-cover" />
              <input aria-label={`Gallery image ${index + 1} alt text`} value={image.caption} onChange={(event) => setGalleryImages((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, caption: event.target.value } : item))} required className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button type="button" onClick={() => setGalleryImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-sm text-slate-600 underline">Remove</button>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={() => router.push(`/recipes/${params.id}`)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">Cancel</button>
          <button type="submit" disabled={saving || uploading} className="rounded-lg bg-orange-600 px-3 py-2 text-sm text-white disabled:opacity-60">
            {saving ? 'Saving...' : 'Save recipe'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-700">{label}</span>
      <input type={type} min={type === 'number' ? 0 : undefined} step={label.endsWith('(g)') ? '0.1' : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
    </label>
  );
}

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
