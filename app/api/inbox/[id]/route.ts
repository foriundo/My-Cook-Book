import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await db.share.updateMany({
    where: { id: params.id, sharedWithId: session.user.id },
    data: { seenAt: new Date() },
  });
  if (!result.count) return NextResponse.json({ error: 'Inbox item not found.' }, { status: 404 });
  return NextResponse.json({ success: true });
}