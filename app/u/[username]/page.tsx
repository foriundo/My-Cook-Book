import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import Link from 'next/link';

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const user = await db.user.findUnique({
    where: { username: params.username },
    include: { recipes: { where: { visibility: 'PUBLIC' } } },
  });

  if (!user) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-sm uppercase tracking-[0.2em] text-orange-700">Public profile</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">@{user.username ?? user.email}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {user.recipes.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">No public recipes yet.</div>
        ) : (
          user.recipes.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft hover:border-orange-300">
              <div className="text-lg font-semibold text-slate-900">{recipe.title}</div>
              <div className="mt-2 text-sm text-slate-600">{recipe.description ?? 'No description'}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
