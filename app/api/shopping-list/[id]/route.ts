import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const itemSchema = z.object({ checked: z.boolean() });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const result = itemSchema.safeParse(await request.json());
  if (!result.success) return NextResponse.json({ error: 'Invalid item update.' }, { status: 400 });

  const updated = await db.shoppingListItem.updateMany({ where: { id: params.id, userId: session.user.id }, data: { checked: result.data.checked } });
  if (!updated.count) return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const deleted = await db.shoppingListItem.deleteMany({ where: { id: params.id, userId: session.user.id } });
  if (!deleted.count) return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
  return NextResponse.json({ success: true });
}