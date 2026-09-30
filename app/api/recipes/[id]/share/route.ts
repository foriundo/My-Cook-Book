import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canUserViewRecipe } from '@/lib/recipeAccess';

const shareSchema = z.object({
  recipientIds: z.array(z.string().min(1)).min(1).max(50),
  message: z.string().trim().max(500).nullable().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const result = shareSchema.safeParse(await request.json());
  if (!result.success) return NextResponse.json({ error: 'Choose at least one friend.' }, { status: 400 });

  const recipe = await db.recipe.findUnique({ where: { id: params.id } });
  if (!recipe || !await canUserViewRecipe(recipe, userId)) {
    return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 });
  }
  if (recipe.ownerId !== userId && recipe.visibility === 'PRIVATE') {
    return NextResponse.json({ error: 'Private recipes cannot be reshared.' }, { status: 403 });
  }

  const recipientIds = [...new Set(result.data.recipientIds)].filter((id) => id !== userId);
  const friendships = await db.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: recipientIds.map((id) => ({ requesterId: userId, addresseeId: id }))
        .concat(recipientIds.map((id) => ({ requesterId: id, addresseeId: userId }))),
    },
    select: { requesterId: true, addresseeId: true },
  });
  const acceptedIds = new Set(friendships.map((friendship) => friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId));
  if (!recipientIds.length || recipientIds.some((id) => !acceptedIds.has(id))) {
    return NextResponse.json({ error: 'Recipes can only be sent to accepted friends.' }, { status: 403 });
  }

  await db.share.createMany({
    data: recipientIds.map((sharedWithId) => ({
      recipeId: recipe.id,
      sharedById: userId,
      sharedWithId,
      message: result.data.message || null,
    })),
  });

  return NextResponse.json({ shared: recipientIds.length }, { status: 201 });
}