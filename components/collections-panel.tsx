'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type CollectionItem = { id: string; name: string; emoji: string | null; recipes: Array<{ recipe: { id: string; title: string } }> };

export function CollectionsPanel() {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const response = await fetch('/api/collections');
    if (response.ok) setCollections(await response.json());
  }

  useEffect(() => {
    void fetch('/api/collections').then(async (response) => {
      if (response.ok) setCollections(await response.json());
    });
  }, []);

  async function createCollection(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const response = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, emoji: emoji || null }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? 'Could not create collection.');
      return;
    }
    setName('');
    setEmoji('');
    await load();
  }

  async function deleteCollection(id: string) {
    const response = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
    if (response.ok) await load();
  }

  return (
    <div className="mx-auto max-w-5xl py-6">
      <form onSubmit={createCollection} className="grid gap-3 border-b border-slate-200 pb-5 sm:grid-cols-[100px_1fr_auto]">
        <label className="text-sm text-slate-700">
          <span className="mb-1 block">Emoji</span>
          <input value={emoji} onChange={(event) => setEmoji(event.target.value)} maxLength={8} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm text-slate-700">
          <span className="mb-1 block">Collection name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="w-full rounded-lg border border-slate-300 px-3 py-2" required />
        </label>
        <button type="submit" className="self-end rounded-lg bg-orange-600 px-4 py-2 text-sm text-white">Create collection</button>
      </form>
      {error && <p role="status" className="mt-3 text-sm text-red-600">{error}</p>}
      {!collections.length ? <p className="mt-5 text-sm text-slate-600">No collections yet.</p> : (
        <ul className="divide-y divide-slate-200">
          {collections.map((collection) => (
            <li key={collection.id} className="flex items-center justify-between gap-4 py-4">
              <Link href={`/collections/${collection.id}`} className="min-w-0">
                <span className="mr-2">{collection.emoji}</span><span className="font-medium text-slate-900">{collection.name}</span>
                <span className="ml-2 text-sm text-slate-500">{collection.recipes.length} recipes</span>
              </Link>
              <button type="button" onClick={() => deleteCollection(collection.id)} className="text-sm text-slate-600 underline">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}