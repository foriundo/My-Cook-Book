import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canUserViewRecipe } from '@/lib/recipeAccess';
import { RecipeDetail } from '@/components/recipe-detail';

export default async function RecipeDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const recipe = await db.recipe.findUnique({
    where: { id: params.id },
    include: {
      ingredients: true,
       images: { orderBy: { order: 'asc' } },
      steps: true,
      ratings: { orderBy: { createdAt: 'desc' } },
      modifications: { where: { userId: session?.user?.id ?? '' }, orderBy: { createdAt: 'desc' } },
      cookLogs: { include: { user: { select: { name: true, username: true } } }, orderBy: { cookedAt: 'desc' }, take: 20 },
      forkedFrom: { include: { owner: { select: { name: true, username: true } } } },
    },
  });

  if (!recipe) {
    notFound();
  }

  if (!await canUserViewRecipe(recipe, session?.user?.id)) {
    notFound();
  }

  return <RecipeDetail recipe={recipe} isOwner={session?.user?.id === recipe.ownerId} isLoggedIn={Boolean(session?.user?.id)} />;
}
