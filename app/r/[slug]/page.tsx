import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canUserViewRecipe } from '@/lib/recipeAccess';
import { SaveRecipeButton } from '@/components/save-recipe-button';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const recipe = await db.recipe.findUnique({
    where: { shareSlug: params.slug },
    select: { title: true, description: true, coverImageUrl: true, caloriesPerServing: true, ratings: { select: { stars: true, userId: true } }, ownerId: true },
  });
  if (!recipe) return { title: 'Recipe not found' };

  const ratings = recipe.ratings.filter((rating) => rating.userId !== recipe.ownerId);
  const average = ratings.length ? (ratings.reduce((sum, rating) => sum + rating.stars, 0) / ratings.length).toFixed(1) : null;
  const summary = [average ? `⭐ ${average}` : null, recipe.caloriesPerServing ? `${recipe.caloriesPerServing} cal` : null].filter(Boolean).join(' · ');
  const description = [recipe.description, summary].filter(Boolean).join(' · ');
  return {
    title: recipe.title,
    description,
    openGraph: { title: recipe.title, description, images: recipe.coverImageUrl ? [recipe.coverImageUrl] : [] },
    twitter: { card: recipe.coverImageUrl ? 'summary_large_image' : 'summary', title: recipe.title, description, images: recipe.coverImageUrl ? [recipe.coverImageUrl] : [] },
  };
}

export default async function SharedRecipePage({ params }: { params: { slug: string } }) {
  const recipe = await db.recipe.findUnique({
    where: { shareSlug: params.slug },
    include: { ingredients: true, steps: true, owner: true },
  });

  if (!recipe) notFound();

  const session = await auth();
  if (!await canUserViewRecipe(recipe, session?.user?.id)) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-sm uppercase tracking-[0.2em] text-orange-700">Shared recipe</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{recipe.title}</h1>
        <p className="mt-2 text-slate-600">By {recipe.owner.name ?? recipe.owner.email}</p>
        {recipe.description && <p className="mt-4 text-slate-700">{recipe.description}</p>}
        {session?.user?.id && session.user.id !== recipe.ownerId && <SaveRecipeButton recipeId={recipe.id} />}
        {!session?.user?.id && <Link href="/signin" className="mt-6 inline-block text-sm font-medium text-orange-700 underline">Sign in to save this recipe</Link>}
      </div>
    </div>
  );
}
