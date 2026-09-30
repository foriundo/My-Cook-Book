import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const collectionSchema = z.object({ name: z.string().trim().min(1).max(80), emoji: z.string().trim().max(8).nullable().optional() });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const collections = await db.collection.findMany({
    where: { userId: session.user.id },
    include: { recipes: { include: { recipe: { select: { id: true, title: true, description: true } } } } },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(collections);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = collectionSchema.safeParse(await request.json());
  if (!result.success) return NextResponse.json({ error: 'A collection name is required.' }, { status: 400 });

  const collection = await db.collection.create({ data: { userId: session.user.id, name: result.data.name, emoji: result.data.emoji ?? null } });
  return NextResponse.json(collection, { status: 201 });
}