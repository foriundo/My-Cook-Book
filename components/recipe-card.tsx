import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';

export function RecipeCard({ recipe }: { recipe: { id: string; ownerId: string; title: string; description?: string | null; baseServings: number; caloriesPerServing?: number | null; tags: string; coverImageUrl?: string | null; coverImageAlt?: string | null; prepMinutes?: number | null; cookMinutes?: number | null; videoUrl?: string | null; ratings?: { userId: string; stars: number }[]; _count?: { cookLogs: number }; }}) {
  let tags: string[] = [];
  try { tags = JSON.parse(recipe.tags || '[]') as string[]; } catch { tags = []; }
  const ratings = recipe.ratings?.filter((rating) => rating.userId !== recipe.ownerId) ?? [];
  const averageRating = ratings.length ? ratings.reduce((sum, rating) => sum + rating.stars, 0) / ratings.length : null;
  const totalMinutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  return (
    <Link href={`/recipes/${recipe.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-soft transition hover:-translate-y-1 hover:border-orange-200">
      <div className="mb-3 h-40 overflow-hidden rounded-xl bg-slate-100">
        {recipe.coverImageUrl ? (
          <Image src={recipe.coverImageUrl} alt={recipe.coverImageAlt || recipe.title} width={800} height={500} unoptimized className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">No image</div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">{recipe.title}</h3>
        {averageRating !== null && <div className="flex items-center gap-1 text-amber-500"><Star className="h-4 w-4 fill-current" /> <span className="text-sm">{averageRating.toFixed(1)}</span></div>}
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{recipe.description || 'A recipe worth saving.'}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="rounded-full bg-orange-50 px-2 py-1 text-orange-700">{recipe.baseServings} servings</span>
        {totalMinutes > 0 && <span className="rounded-full bg-slate-100 px-2 py-1">{totalMinutes} min</span>}
        {recipe.caloriesPerServing && <span className="rounded-full bg-slate-100 px-2 py-1">{recipe.caloriesPerServing} cal</span>}
        {recipe.videoUrl && <span aria-label="Has video" className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-800">▶ Video</span>}
        {recipe._count && <span className="rounded-full bg-slate-100 px-2 py-1">Cooked {recipe._count.cookLogs}×</span>}
        {tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-1">#{tag}</span>)}
      </div>
    </Link>
  );
}
