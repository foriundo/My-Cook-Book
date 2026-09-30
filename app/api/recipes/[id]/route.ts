import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canUserViewRecipe } from '@/lib/recipeAccess';
import { recipeInputSchema } from '@/lib/recipeValidation';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const recipe = await db.recipe.findUnique({
    where: { id: params.id },
    include: { ingredients: true, steps: true, images: { orderBy: { order: 'asc' } }, ratings: true, modifications: true },
  });

  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!await canUserViewRecipe(recipe, session?.user?.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(recipe);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const recipe = await db.recipe.findUnique({ where: { id: params.id } });
  if (!recipe || recipe.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = recipeInputSchema.partial().safeParse(await request.json());
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid recipe data.', details: result.error.flatten() }, { status: 400 });
  }
  const input = result.data;

  const updated = await db.$transaction(async (transaction) => {
    const updatedRecipe = await transaction.recipe.update({
      where: { id: recipe.id },
      data: {
        title: input.title ?? recipe.title,
        description: input.description === undefined ? recipe.description : input.description,
        coverImageUrl: input.coverImageUrl === undefined ? recipe.coverImageUrl : input.coverImageUrl,
        coverImageAlt: input.coverImageAlt === undefined ? recipe.coverImageAlt : input.coverImageAlt,
        baseServings: input.baseServings ?? recipe.baseServings,
        prepMinutes: input.prepMinutes === undefined ? recipe.prepMinutes : input.prepMinutes,
        cookMinutes: input.cookMinutes === undefined ? recipe.cookMinutes : input.cookMinutes,
        difficulty: input.difficulty === undefined ? recipe.difficulty : input.difficulty,
        cuisine: input.cuisine === undefined ? recipe.cuisine : input.cuisine,
        tags: input.tags ? JSON.stringify(input.tags) : recipe.tags,
        caloriesPerServing: input.caloriesPerServing === undefined ? recipe.caloriesPerServing : input.caloriesPerServing,
        proteinG: input.proteinG === undefined ? recipe.proteinG : input.proteinG,
        carbsG: input.carbsG === undefined ? recipe.carbsG : input.carbsG,
        fatG: input.fatG === undefined ? recipe.fatG : input.fatG,
        visibility: input.visibility ?? recipe.visibility,
        shareSlug: (input.visibility === 'PUBLIC' || input.visibility === 'UNLISTED') && !recipe.shareSlug
          ? randomUUID()
          : input.visibility === 'PRIVATE' || input.visibility === 'FRIENDS'
            ? null
            : recipe.shareSlug,
        sourceUrl: input.sourceUrl === undefined ? recipe.sourceUrl : input.sourceUrl,
        videoUrl: input.videoUrl === undefined ? recipe.videoUrl : input.videoUrl,
      },
    });

    if (input.images) {
      await transaction.recipeImage.deleteMany({ where: { recipeId: recipe.id } });
      await transaction.recipeImage.createMany({
        data: input.images.map((image, order) => ({ recipeId: recipe.id, url: image.url, caption: image.caption ?? null, order })),
      });
    }

    if (input.ingredients) {
      await transaction.ingredient.deleteMany({ where: { recipeId: recipe.id } });
      await transaction.ingredient.createMany({
        data: input.ingredients.map((ingredient, order) => ({
          recipeId: recipe.id,
          order,
          name: ingredient.name,
          quantity: ingredient.quantity ?? null,
          unit: ingredient.unit ?? null,
          note: ingredient.note ?? null,
          group: ingredient.group ?? null,
          scalable: ingredient.scalable ?? true,
        })),
      });
    }

    if (input.steps) {
      await transaction.step.deleteMany({ where: { recipeId: recipe.id } });
      await transaction.step.createMany({
        data: input.steps.map((step, order) => ({
          recipeId: recipe.id,
          order,
          text: step.text,
          timerSeconds: step.timerSeconds ?? null,
          imageUrl: step.imageUrl ?? null,
        })),
      });
    }

    return updatedRecipe;
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const recipe = await db.recipe.findUnique({ where: { id: params.id } });
  if (!recipe || recipe.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.recipe.delete({ where: { id: recipe.id } });
  return NextResponse.json({ success: true });
}
