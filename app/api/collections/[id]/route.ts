import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const collection = await db.collection.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { recipes: { include: { recipe: { select: { id: true, title: true, description: true } } } } },
  });
  if (!collection) return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
  return NextResponse.json(collection);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await db.collection.deleteMany({ where: { id: params.id, userId: session.user.id } });
  if (!result.count) return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
  return NextResponse.json({ success: true });
}