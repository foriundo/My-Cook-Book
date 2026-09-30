import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const statusSchema = z.object({ status: z.enum(['ACCEPTED', 'DECLINED', 'BLOCKED']) });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = statusSchema.safeParse(await request.json());
  if (!result.success) return NextResponse.json({ error: 'Invalid friend request action.' }, { status: 400 });

  const friendship = await db.friendship.findUnique({ where: { id: params.id } });
  if (!friendship || friendship.addresseeId !== session.user.id) {
    return NextResponse.json({ error: 'Friend request not found.' }, { status: 404 });
  }

  if (result.data.status === 'DECLINED') {
    await db.friendship.delete({ where: { id: friendship.id } });
    return NextResponse.json({ success: true });
  }

  const updated = await db.friendship.update({ where: { id: friendship.id }, data: { status: result.data.status } });
  return NextResponse.json({ id: updated.id, status: updated.status });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const friendship = await db.friendship.findUnique({ where: { id: params.id } });
  if (!friendship || (friendship.requesterId !== session.user.id && friendship.addresseeId !== session.user.id)) {
    return NextResponse.json({ error: 'Friendship not found.' }, { status: 404 });
  }

  await db.friendship.delete({ where: { id: friendship.id } });
  return NextResponse.json({ success: true });
}