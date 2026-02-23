import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyTelegramInitData } from '@/lib/telegram';
import { requireServerEnv } from '@/lib/serverEnv';
import { SignJWT } from 'jose';

function getJwtSecretKey() {
  const jwtSecret = requireServerEnv('JWT_SECRET');
  return new TextEncoder().encode(jwtSecret);
}

function readAuthEnv() {
  const telegramBotToken = requireServerEnv('TELEGRAM_BOT_TOKEN');
  // Prisma requires DATABASE_URL, so validate here for explicit erroring.
  requireServerEnv('DATABASE_URL');
  return { telegramBotToken };
}

export async function POST(req: Request) {
  try {
    const { telegramBotToken } = readAuthEnv();
    const body = await req.json();
    const initData: string = body?.initData || '';
    if (!initData) return NextResponse.json({ error: 'initData required' }, { status: 400 });

    const verification = verifyTelegramInitData(initData, telegramBotToken);
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
    console.error('Telegram auth route failed:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    if (message.includes('Missing required environment variable')) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
    if (message.includes('P1001') || message.toLowerCase().includes('database')) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
