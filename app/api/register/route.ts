import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const name = String(body.name ?? '').trim() || 'Cookbook User';

  if (!email || password.length < 6) {
    return NextResponse.json({ error: 'Email and a password with at least 6 characters are required.' }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 });
  }

  const passwordHash = await hash(password, 10);
  const user = await db.user.create({
    data: {
      email,
      name,
      username: email.split('@')[0],
      passwordHash,
    },
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
