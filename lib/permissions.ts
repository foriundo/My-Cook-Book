export function canView({ isOwner, isLoggedIn, isFriend, visibility, isShared }: { isOwner: boolean; isLoggedIn: boolean; isFriend: boolean; visibility: string; isShared?: boolean }) {
  if (isOwner) return true;
  if (visibility === 'PUBLIC' || visibility === 'UNLISTED') return true;
  if (visibility === 'FRIENDS') return Boolean(isLoggedIn && (isFriend || isShared));
  if (visibility === 'PRIVATE') return Boolean(isLoggedIn && isShared);
  return false;
}

export function canEdit({ isOwner }: { isOwner: boolean }) {
  return isOwner;
}

export function canRate({ isLoggedIn, isOwner }: { isLoggedIn: boolean; isOwner?: boolean }) {
  return isLoggedIn || Boolean(isOwner);
}

export function canCreateModification({ isLoggedIn, canViewRecipe }: { isLoggedIn: boolean; canViewRecipe: boolean }) {
  return canViewRecipe && isLoggedIn;
}

export function canFork({ isLoggedIn, canViewRecipe }: { isLoggedIn: boolean; canViewRecipe: boolean }) {
  return canViewRecipe && isLoggedIn;
}
