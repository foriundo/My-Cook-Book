import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canUserViewRecipe } from '@/lib/recipeAccess';

const recipeSchema = z.object({ recipeId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = recipeSchema.safeParse(await request.json());
  if (!result.success) return NextResponse.json({ error: 'Recipe is required.' }, { status: 400 });

  const [collection, recipe] = await Promise.all([
    db.collection.findFirst({ where: { id: params.id, userId: session.user.id }, select: { id: true } }),
    db.recipe.findUnique({ where: { id: result.data.recipeId } }),
  ]);
  if (!collection) return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
  if (!recipe || !await canUserViewRecipe(recipe, session.user.id)) return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 });

  await db.collectionRecipe.upsert({
    where: { collectionId_recipeId: { collectionId: collection.id, recipeId: recipe.id } },
    create: { collectionId: collection.id, recipeId: recipe.id },
    update: {},
  });
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const recipeId = new URL(request.url).searchParams.get('recipeId');
  if (!recipeId) return NextResponse.json({ error: 'Recipe is required.' }, { status: 400 });

  const collection = await db.collection.findFirst({ where: { id: params.id, userId: session.user.id }, select: { id: true } });
  if (!collection) return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
  await db.collectionRecipe.deleteMany({ where: { collectionId: collection.id, recipeId } });
  return NextResponse.json({ success: true });
}