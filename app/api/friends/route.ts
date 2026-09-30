import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const requestSchema = z.object({ target: z.string().trim().min(1).max(200) });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const friendships = await db.friendship.findMany({
    where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: {
      requester: { select: { id: true, name: true, email: true, username: true } },
      addressee: { select: { id: true, name: true, email: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(friendships.map((friendship) => ({
    id: friendship.id,
    status: friendship.status,
    direction: friendship.requesterId === userId ? 'sent' : 'received',
    user: friendship.requesterId === userId ? friendship.addressee : friendship.requester,
    createdAt: friendship.createdAt,
  })));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = requestSchema.safeParse(await request.json());
  if (!result.success) return NextResponse.json({ error: 'Enter a username or email.' }, { status: 400 });

  const targetValue = result.data.target;
  const target = await db.user.findFirst({
    where: { OR: [{ email: targetValue.toLowerCase() }, { username: targetValue.replace(/^@/, '') }] },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: 'No user matched that username or email.' }, { status: 404 });
  if (target.id === session.user.id) return NextResponse.json({ error: 'You cannot add yourself.' }, { status: 400 });

  const [existing, reverse] = await Promise.all([
    db.friendship.findUnique({ where: { requesterId_addresseeId: { requesterId: session.user.id, addresseeId: target.id } } }),
    db.friendship.findUnique({ where: { requesterId_addresseeId: { requesterId: target.id, addresseeId: session.user.id } } }),
  ]);

  if (existing?.status === 'ACCEPTED' || reverse?.status === 'ACCEPTED') {
    return NextResponse.json({ error: 'You are already friends.' }, { status: 409 });
  }
  if (existing?.status === 'PENDING') return NextResponse.json({ error: 'A request is already pending.' }, { status: 409 });

  if (reverse?.status === 'PENDING') {
    const accepted = await db.friendship.update({ where: { id: reverse.id }, data: { status: 'ACCEPTED' } });
    return NextResponse.json({ id: accepted.id, status: accepted.status }, { status: 200 });
  }

  const friendship = await db.friendship.upsert({
    where: { requesterId_addresseeId: { requesterId: session.user.id, addresseeId: target.id } },
    create: { requesterId: session.user.id, addresseeId: target.id },
    update: { status: 'PENDING' },
  });
  return NextResponse.json({ id: friendship.id, status: friendship.status }, { status: 201 });
}