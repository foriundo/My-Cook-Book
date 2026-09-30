import { db } from '@/lib/db';
import { canView } from '@/lib/permissions';

export async function canUserViewRecipe(recipe: { id: string; ownerId: string; visibility: string | null }, userId?: string) {
  const isOwner = userId === recipe.ownerId;
  if (isOwner || recipe.visibility === 'PUBLIC' || recipe.visibility === 'UNLISTED') return true;
  if (!userId) return false;

  const [friendship, directShare] = await Promise.all([
    db.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userId, addresseeId: recipe.ownerId },
          { requesterId: recipe.ownerId, addresseeId: userId },
        ],
      },
      select: { id: true },
    }),
    db.share.findFirst({ where: { recipeId: recipe.id, sharedWithId: userId }, select: { id: true } }),
  ]);

  return canView({
    isOwner,
    isLoggedIn: true,
    isFriend: Boolean(friendship),
    isShared: Boolean(directShare),
    visibility: recipe.visibility ?? 'PRIVATE',
  });
}