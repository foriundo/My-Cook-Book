import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { recipeInputSchema } from '@/lib/recipeValidation';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const recipes = await db.recipe.findMany({
    where: { ownerId: session.user.id },
    include: { ingredients: true, steps: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(recipes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = recipeInputSchema.safeParse(await request.json());
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid recipe data.', details: result.error.flatten() }, { status: 400 });
  }
  const input = result.data;

  const recipe = await db.recipe.create({
    data: {
      ownerId: session.user.id,
      title: input.title,
      description: input.description ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      coverImageAlt: input.coverImageAlt ?? null,
      baseServings: input.baseServings ?? 4,
      prepMinutes: input.prepMinutes ?? null,
      cookMinutes: input.cookMinutes ?? null,
      difficulty: input.difficulty ?? 'MEDIUM',
      cuisine: input.cuisine ?? null,
      tags: JSON.stringify(input.tags ?? []),
      sourceUrl: input.sourceUrl ?? null,
      videoUrl: input.videoUrl ?? null,
      caloriesPerServing: input.caloriesPerServing ?? null,
      proteinG: input.proteinG ?? null,
      carbsG: input.carbsG ?? null,
      fatG: input.fatG ?? null,
      visibility: input.visibility ?? 'PRIVATE',
      shareSlug: input.visibility === 'UNLISTED' || input.visibility === 'PUBLIC' ? randomUUID() : null,
      images: { create: (input.images ?? []).map((image, order) => ({ url: image.url, caption: image.caption ?? null, order })) },
      ingredients: {
        create: (input.ingredients ?? []).map((ingredient, index) => ({
          order: index,
          name: ingredient.name,
          quantity: ingredient.quantity ?? null,
          unit: ingredient.unit ?? null,
          note: ingredient.note ?? null,
          group: ingredient.group ?? null,
          scalable: ingredient.scalable ?? true,
        })),
      },
      steps: {
        create: (input.steps ?? []).map((step, index) => ({
          order: index,
          text: step.text,
          timerSeconds: step.timerSeconds ?? null,
          imageUrl: step.imageUrl ?? null,
        })),
      },
    },
  });

  return NextResponse.json({ id: recipe.id });
}
