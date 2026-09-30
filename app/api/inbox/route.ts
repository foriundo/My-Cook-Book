import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const shares = await db.share.findMany({
    where: { sharedWithId: session.user.id },
    include: {
      recipe: { select: { id: true, title: true, description: true, shareSlug: true, visibility: true } },
      sharedBy: { select: { name: true, username: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(shares);
}