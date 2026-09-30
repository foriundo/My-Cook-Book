import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canUserViewRecipe } from '@/lib/recipeAccess';
import { CookMode } from '@/components/cook-mode';

export default async function CookPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const recipe = await db.recipe.findUnique({
    where: { id: params.id },
    include: { ingredients: { orderBy: { order: 'asc' } }, steps: { orderBy: { order: 'asc' } } },
  });
  if (!recipe || !await canUserViewRecipe(recipe, session.user.id)) notFound();

  return <CookMode recipe={recipe} />;
}