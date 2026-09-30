'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type InboxShare = {
  id: string;
  message: string | null;
  seenAt: string | null;
  createdAt: string;
  recipe: { id: string; title: string; description: string | null; shareSlug: string | null; visibility: string };
  sharedBy: { name: string | null; username: string | null; email: string };
};

export function InboxPanel() {
  const [items, setItems] = useState<InboxShare[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/inbox').then(async (response) => {
      if (response.ok) setItems(await response.json());
      setLoading(false);
    });
  }, []);

  async function markRead(id: string) {
    const response = await fetch(`/api/inbox/${id}`, { method: 'PATCH' });
    if (response.ok) setItems((current) => current.map((item) => item.id === id ? { ...item, seenAt: new Date().toISOString() } : item));
  }

  if (loading) return <p className="mt-6 text-sm text-slate-600">Loading inbox...</p>;
  if (!items.length) return <p className="mt-6 text-slate-600">No recipe shares yet.</p>;

  return (
    <ul className="mt-6 divide-y divide-slate-200">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-start justify-between gap-4 py-5">
          <div>
            <p className="font-semibold text-slate-900">{item.recipe.title}</p>
            <p className="mt-1 text-sm text-slate-600">Shared by {item.sharedBy.name ?? item.sharedBy.username ?? item.sharedBy.email}</p>
            {item.message && <p className="mt-2 text-sm text-slate-700">“{item.message}”</p>}
            <Link href={`/recipes/${item.recipe.id}`} onClick={() => { if (!item.seenAt) void markRead(item.id); }} className="mt-3 inline-flex text-sm font-medium text-orange-700 underline">Open recipe</Link>
          </div>
          <div className="flex items-center gap-3">
            {!item.seenAt && <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">Unread</span>}
            {!item.seenAt && <button type="button" onClick={() => markRead(item.id)} className="text-sm text-slate-600 underline">Mark read</button>}
          </div>
        </li>
      ))}
    </ul>
  );
}