import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canUserViewRecipe } from '@/lib/recipeAccess';
import { applyIngredientChanges, type IngredientChange } from '@/lib/modifications';
import { z } from 'zod';

const forkSchema = z.object({ modificationId: z.string().min(1).optional() });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in to save this recipe.' }, { status: 401 });
  }

  const source = await db.recipe.findUnique({
    where: { id: params.id },
    include: { ingredients: true, steps: true, images: true },
  });

  if (!source) return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 });
  if (!await canUserViewRecipe(source, session.user.id)) {
    return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const result = forkSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: 'Invalid modification selected.' }, { status: 400 });
  const modification = result.data.modificationId
    ? await db.modification.findFirst({ where: { id: result.data.modificationId, recipeId: source.id, userId: session.user.id } })
    : null;
  if (result.data.modificationId && !modification) return NextResponse.json({ error: 'Modification not found.' }, { status: 404 });

  let changes: IngredientChange[] = [];
  try { changes = modification ? JSON.parse(modification.ingredientChanges) as IngredientChange[] : []; } catch { changes = []; }
  const ingredients = applyIngredientChanges(source.ingredients, changes).filter((ingredient) => ingredient.changeType !== 'removed');

  const clone = await db.recipe.create({
    data: {
      ownerId: session.user.id,
      title: modification ? `${source.title} (remix)` : `${source.title} (copy)`,
      description: source.description,
      coverImageUrl: source.coverImageUrl,
      coverImageAlt: source.coverImageAlt,
      baseServings: modification?.servings ?? source.baseServings,
      prepMinutes: source.prepMinutes,
      cookMinutes: source.cookMinutes,
      difficulty: source.difficulty,
      cuisine: source.cuisine,
      tags: source.tags,
      sourceUrl: source.sourceUrl,
      videoUrl: source.videoUrl,
      videoStartSec: source.videoStartSec,
      caloriesPerServing: source.caloriesPerServing,
      proteinG: source.proteinG,
      carbsG: source.carbsG,
      fatG: source.fatG,
      forkedFromId: source.id,
      visibility: 'PRIVATE',
      ingredients: {
        create: ingredients.map((ingredient, order) => ({
          order,
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          note: ingredient.note,
          group: ingredient.group ?? null,
          scalable: ingredient.scalable ?? true,
        })),
      },
      steps: {
        create: source.steps.map((step) => ({
          order: step.order,
          text: step.text,
          timerSeconds: step.timerSeconds,
          imageUrl: step.imageUrl,
        })),
      },
      images: {
        create: source.images.map((image) => ({
          url: image.url,
          caption: image.caption,
          order: image.order,
        })),
      },
    },
  });

  return NextResponse.json({ id: clone.id });
}
