import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyTelegramInitData } from '@/lib/telegram';
import { SignJWT } from 'jose';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const JWT_SECRET = process.env.JWT_SECRET || '';

function getJwtSecretKey() {
  if (!JWT_SECRET) throw new Error('Missing JWT_SECRET');
  return new TextEncoder().encode(JWT_SECRET);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const initData: string = body?.initData || '';
    if (!initData) return NextResponse.json({ error: 'initData required' }, { status: 400 });
    if (!TELEGRAM_BOT_TOKEN) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

    const verification = verifyTelegramInitData(initData, TELEGRAM_BOT_TOKEN);
    if (!verification.ok) return NextResponse.json({ error: verification.error }, { status: 401 });

    const userRaw = verification.data?.user;
    if (!userRaw) return NextResponse.json({ error: 'Missing user' }, { status: 401 });
    const tgUser = JSON.parse(userRaw);

    const telegramUserId = String(tgUser.id);
    let user = await prisma.user.findUnique({ where: { telegramUserId } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramUserId,
          username: tgUser.username ?? null,
          firstName: tgUser.first_name ?? null,
          lastName: tgUser.last_name ?? null,
          photoUrl: tgUser.photo_url ?? null,
          nickname: tgUser.username ?? tgUser.first_name ?? null,
        }
      });
    } else {
      user = await prisma.user.update({
        where: { telegramUserId },
        data: {
          username: tgUser.username ?? user.username,
          firstName: tgUser.first_name ?? user.firstName,
          lastName: tgUser.last_name ?? user.lastName,
          photoUrl: tgUser.photo_url ?? user.photoUrl,
        }
      });
    }

    const token = await new SignJWT({
      sub: user.id,
      telegramUserId: user.telegramUserId,
      nickname: user.nickname,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(getJwtSecretKey());

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        telegramUserId: user.telegramUserId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        nickname: user.nickname,
      },
      isFirstTime: !user.nickname,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
