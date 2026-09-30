import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canUserViewRecipe } from '@/lib/recipeAccess';

const cookLogSchema = z.object({
  servings: z.number().int().min(1).max(100),
  note: z.string().trim().max(1000).nullable().optional(),
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const recipe = await db.recipe.findUnique({ where: { id: params.id } });
  if (!recipe) return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 });
  const session = await auth();
  if (!await canUserViewRecipe(recipe, session?.user?.id)) return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 });

  const logs = await db.cookLog.findMany({
    where: { recipeId: recipe.id },
    include: { user: { select: { name: true, username: true } } },
    orderBy: { cookedAt: 'desc' },
    take: 20,
  });
  return NextResponse.json(logs);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = cookLogSchema.safeParse(await request.json());
  if (!result.success) return NextResponse.json({ error: 'Enter a serving count between 1 and 100.' }, { status: 400 });

  const recipe = await db.recipe.findUnique({ where: { id: params.id } });
  if (!recipe || !await canUserViewRecipe(recipe, session.user.id)) return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 });

  const log = await db.cookLog.create({
    data: { recipeId: recipe.id, userId: session.user.id, servings: result.data.servings, note: result.data.note ?? null },
  });
  return NextResponse.json(log, { status: 201 });
}