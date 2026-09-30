import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canUserViewRecipe } from '@/lib/recipeAccess';

const ingredientChangeSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('add'), name: z.string().trim().min(1).max(200), quantity: z.number().positive().nullable().optional(), unit: z.string().trim().max(40).nullable().optional(), note: z.string().trim().max(300).nullable().optional() }),
  z.object({ action: z.literal('change'), ingredientId: z.string().min(1), quantity: z.number().positive().nullable().optional(), unit: z.string().trim().max(40).nullable().optional(), note: z.string().trim().max(300).nullable().optional() }),
  z.object({ action: z.literal('remove'), ingredientId: z.string().min(1) }),
]);

const modificationSchema = z.object({
  title: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2000).nullable().optional(),
  ingredientChanges: z.array(ingredientChangeSchema).max(100).optional(),
  servings: z.number().int().min(1).max(100).nullable().optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const recipe = await db.recipe.findUnique({ where: { id: params.id } });
  if (!recipe || !await canUserViewRecipe(recipe, session.user.id)) return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 });

  const modifications = await db.modification.findMany({
    where: { recipeId: recipe.id, userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(modifications);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const recipe = await db.recipe.findUnique({ where: { id: params.id }, include: { ingredients: { select: { id: true } } } });
  if (!recipe || !await canUserViewRecipe(recipe, userId)) {
    return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 });
  }

  const result = modificationSchema.safeParse(await request.json());
  if (!result.success) return NextResponse.json({ error: 'Invalid modification data.' }, { status: 400 });
  const input = result.data;
  const ingredientIds = new Set(recipe.ingredients.map((ingredient) => ingredient.id));
  if ((input.ingredientChanges ?? []).some((change) => change.action !== 'add' && !ingredientIds.has(change.ingredientId))) {
    return NextResponse.json({ error: 'A modification references an ingredient outside this recipe.' }, { status: 400 });
  }

  const modification = await db.$transaction(async (transaction) => {
    if (input.isDefault) {
      await transaction.modification.updateMany({ where: { recipeId: recipe.id, userId }, data: { isDefault: false } });
    }
    return transaction.modification.create({
      data: {
        userId,
        recipeId: params.id,
        title: input.title,
        notes: input.notes ?? null,
        ingredientChanges: JSON.stringify(input.ingredientChanges ?? []),
        servings: input.servings ?? null,
        isDefault: input.isDefault ?? false,
      },
    });
  });

  return NextResponse.json(modification);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;
  const schema = z.object({ modificationId: z.string().min(1), isDefault: z.boolean() });
  const result = schema.safeParse(await request.json());
  if (!result.success) return NextResponse.json({ error: 'Invalid default modification request.' }, { status: 400 });

  const modification = await db.modification.findFirst({ where: { id: result.data.modificationId, recipeId: params.id, userId } });
  if (!modification) return NextResponse.json({ error: 'Modification not found.' }, { status: 404 });

  await db.$transaction(async (transaction) => {
    if (result.data.isDefault) {
      await transaction.modification.updateMany({ where: { recipeId: params.id, userId }, data: { isDefault: false } });
    }
    await transaction.modification.update({ where: { id: modification.id }, data: { isDefault: result.data.isDefault } });
  });
  return NextResponse.json({ success: true });
}
