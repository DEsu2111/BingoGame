// Result page with distinct win / loss experiences and Telegram sharing.
'use client';

import { useEffect, useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import { useMultiplayerBingo } from '@/hooks/useMultiplayerBingo';

const TELEGRAM_BOT = 'desu'; // your bot username

function shareToTelegram(status: 'win' | 'loss', score: number) {
  const message =
    status === 'win'
      ? `ዋው! በቢንጎ ጨዋታ አሸነፍኩ! 🏆 የእናንተስ ዕድል እንዴት ነው? በ @${TELEGRAM_BOT} ይሞክሩ!`
      : `ጥቂት ነው የቀረኝ! 🥺 በቀጣይ በእርግጠኝነት አሸንፋለሁ! እናንተም በ @${TELEGRAM_BOT} ተጫወቱ!`;

  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent('https://yourgame.com')}&text=${encodeURIComponent(
    message,
  )}&score=${encodeURIComponent(score)}`;
  if (typeof window !== 'undefined') {
    window.open(telegramUrl, '_blank');
  }
}

export default function ResultPage() {
  const { state, dispatch } = useGame();
  const { nickname, lastWinner } = useMultiplayerBingo();

  const winnerName = lastWinner ?? state.winnerName ?? null;
  const isSelfWinner = winnerName && nickname && winnerName === nickname;
  const noWinner = winnerName === 'No winner' || !winnerName;

  // After 6s, return to welcome and wait for the next server countdown to hit 0
  useEffect(() => {
    const id = setTimeout(() => {
      dispatch({ type: 'PLAY_AGAIN' });
    }, 6000);
    return () => clearTimeout(id);
  }, [dispatch]);

  // Unified background color for result screen
  const bgClass = 'bg-slate-950';
  const cardClass = isSelfWinner ? 'glass-card-win' : 'glass-card-loss';

  const headline = isSelfWinner
    ? 'YOU ARE THE WINNER!'
    : noWinner
      ? 'SO CLOSE! NO ONE WON.'
      : `WINNER: ${winnerName}`;

  const subline = isSelfWinner
    ? `Congrats, ${nickname}! You won $${state.winAmount.toFixed(2)}.`
    : noWinner
      ? 'No one claimed Bingo this round. Try again next round.'
      : `${winnerName} took this round. You can win the next one.`;

  const icon = isSelfWinner ? '🏆' : noWinner ? '😮‍💨' : '🎉';
  const actionLabel = isSelfWinner ? 'Share to Telegram' : 'Play Next Round';
  const actionClick = () => (isSelfWinner ? shareToTelegram('win', state.winAmount) : dispatch({ type: 'PLAY_AGAIN' }));

  const detailLines = useMemo(() => {
    const lines = [
      `Matched: ${state.matchedCount}`,
      `Bet: $${state.betAmount.toFixed(2)}`,
      isSelfWinner ? `Payout: $${state.winAmount.toFixed(2)}` : 'Payout: $0.00',
    ];
    if (state.calledNumbersList.length) {
      lines.push(`Calls this round: ${state.calledNumbersList.length}`);
    }
    if (state.results.length) {
      lines.push(`Rounds played: ${state.results.length}`);
    }
    return lines;
  }, [isSelfWinner, state.betAmount, state.calledNumbersList.length, state.matchedCount, state.results.length, state.winAmount]);

  return (
    <main className={`min-h-screen p-4 sm:p-6 md:p-8 ${bgClass}`}>
      <div className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center">
        <div className={`relative w-full overflow-hidden rounded-3xl border border-white/15 p-6 sm:p-8 shadow-2xl ${cardClass}`}>
          <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/16 via-white/6 to-transparent blur-3xl" />
          {isSelfWinner ? <div className="confetti confetti-1" /> : null}
          {isSelfWinner ? <div className="confetti confetti-2" /> : null}
          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
            <div className={isSelfWinner ? 'trophy-blob' : 'robot-blob'}>{icon}</div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-lg">
              {headline}
            </h1>
            <p className="max-w-xl text-base sm:text-lg text-white/85">{subline}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-white/85">
              {detailLines.map((line) => (
                <span key={line} className="rounded-full bg-white/12 px-3 py-1 backdrop-blur">
                  {line}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button type="button" onClick={actionClick} className={isSelfWinner ? 'btn-telegram' : 'btn-double'}>
                {isSelfWinner ? '✈️ ' : '🔁 '} {actionLabel}
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'PLAY_AGAIN' })}
                className="btn-ghost"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'VIEW_GAME' })}
                className="btn-ghost-secondary"
              >
                View Drawn Numbers
              </button>
            </div>
            <div className="w-full pt-4 text-center text-sm text-white/80">
              {isSelfWinner ? (
                <p className="font-semibold">Share the win with friends via Telegram bot <strong>@desu</strong></p>
              ) : (
                <p className="font-semibold">Need a boost? Chat with bot <strong>@desu</strong> to share or get tips.</p>
              )}
              <a
                href="https://t.me/desu"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center mt-2 px-4 py-2 rounded-full bg-white/15 border border-white/25 text-sm font-bold text-white hover:bg-white/20"
              >
                Open @desu
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
