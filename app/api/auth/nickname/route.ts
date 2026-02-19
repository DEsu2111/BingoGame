import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || '';

async function verifyToken(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) throw new Error('Missing token');
  const secret = new TextEncoder().encode(JWT_SECRET);
  const { payload } = await jwtVerify(token, secret);
  return payload;
}

export async function POST(req: Request) {
  try {
    if (!JWT_SECRET) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    const payload = await verifyToken(req);
    const body = await req.json();
    const nickname = String(body?.nickname || '').trim();
    if (nickname.length < 3) return NextResponse.json({ error: 'Nickname too short' }, { status: 400 });

    const userId = String(payload.sub || '');
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const user = await prisma.user.update({
      where: { id: userId },
      data: { nickname },
    });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
