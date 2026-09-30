import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canUserViewRecipe } from '@/lib/recipeAccess';

const QRCode = require('qrcode') as { toDataURL: (text: string, options?: { margin?: number; width?: number }) => Promise<string> };

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const recipe = await db.recipe.findUnique({ where: { id: params.id } });
  if (!recipe || !recipe.shareSlug || !await canUserViewRecipe(recipe, session.user.id)) {
    return NextResponse.json({ error: 'A shareable recipe link is not available.' }, { status: 404 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const dataUrl = await QRCode.toDataURL(new URL(`/r/${recipe.shareSlug}`, origin).toString(), { margin: 1, width: 320 });
  return NextResponse.json({ dataUrl });
}