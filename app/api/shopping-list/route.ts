import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canUserViewRecipe } from '@/lib/recipeAccess';

const itemSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().trim().max(40).nullable().optional(),
  recipeId: z.string().min(1).optional(),
  servings: z.number().int().min(1).max(100).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const items = await db.shoppingListItem.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;
  const result = itemSchema.safeParse(await request.json());
  if (!result.success) return NextResponse.json({ error: 'Invalid shopping-list item.' }, { status: 400 });
  const input = result.data;

  if (input.recipeId) {
    const recipe = await db.recipe.findUnique({ where: { id: input.recipeId }, include: { ingredients: true } });
    if (!recipe || !await canUserViewRecipe(recipe, userId)) return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 });
    const targetServings = input.servings ?? recipe.baseServings;
    const items = recipe.ingredients.map((ingredient) => ({
      userId,
      name: ingredient.name,
      quantity: ingredient.quantity === null ? null : ingredient.scalable ? ingredient.quantity * targetServings / recipe.baseServings : ingredient.quantity,
      unit: ingredient.unit,
      fromRecipeId: recipe.id,
    }));
    await db.shoppingListItem.createMany({ data: items });
    return NextResponse.json({ added: items.length }, { status: 201 });
  }

  if (!input.name) return NextResponse.json({ error: 'An item name is required.' }, { status: 400 });
  const item = await db.shoppingListItem.create({
    data: { userId, name: input.name, quantity: input.quantity ?? null, unit: input.unit ?? null },
  });
  return NextResponse.json(item, { status: 201 });
}