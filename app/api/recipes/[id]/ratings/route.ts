import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canUserViewRecipe } from '@/lib/recipeAccess';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const recipe = await db.recipe.findUnique({ where: { id: params.id } });
  if (!recipe || !await canUserViewRecipe(recipe, session.user.id)) {
    return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 });
  }

  const body = await request.json();
  const stars = Number(body.stars ?? 0);
  if (!stars || stars < 1 || stars > 5) {
    return NextResponse.json({ error: 'A rating between 1 and 5 is required.' }, { status: 400 });
  }

  const rating = await db.rating.upsert({
    where: {
      userId_recipeId: {
        userId: session.user.id,
        recipeId: params.id,
      },
    },
    update: {
      stars,
      review: body.review ?? null,
      wouldMakeAgain: body.wouldMakeAgain ?? null,
    },
    create: {
      userId: session.user.id,
      recipeId: params.id,
      stars,
      review: body.review ?? null,
      wouldMakeAgain: body.wouldMakeAgain ?? null,
    },
  });

  return NextResponse.json(rating);
}
