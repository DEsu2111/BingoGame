'use client';

import { useEffect, useMemo, useState } from 'react';
import { useGame } from '@/context/GameContext';

const TELEGRAM_BOT_USERNAME = 'OnlineBingoGame_bot';
const TELEGRAM_BOT_NAME = 'BingoGame';
const AUTO_RETURN_SECONDS = 10;

function shareToTelegram(status: 'win' | 'loss', score: number) {
  const message =
    status === 'win'
      ? `I just won a Bingo round. Join me at @${TELEGRAM_BOT_USERNAME}.`
      : `I finished a Bingo round. Play with me at @${TELEGRAM_BOT_USERNAME}.`;

  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent('https://yourgame.com')}&text=${encodeURIComponent(
    message,
  )}&score=${encodeURIComponent(score)}`;

  if (typeof window !== 'undefined') {
    window.open(telegramUrl, '_blank');
  }
}

type ResultPageProps = {
  nickname: string;
  lastWinner: string | null;
  onLogout: () => void;
};

export default function ResultPage({ nickname, lastWinner, onLogout }: ResultPageProps) {
  const { state, dispatch } = useGame();
  const [secondsLeft, setSecondsLeft] = useState(AUTO_RETURN_SECONDS);

  const winnerName = lastWinner ?? state.winnerName ?? null;
  const isSelfWinner = Boolean(winnerName && nickname && winnerName === nickname);
  const noWinner = winnerName === 'No winner' || !winnerName;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      dispatch({ type: 'PLAY_AGAIN' });
    }, AUTO_RETURN_SECONDS * 1000);

    const intervalId = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [dispatch]);

  const status: 'win' | 'loss' = isSelfWinner ? 'win' : 'loss';
  const headline = isSelfWinner
    ? 'Round Won'
    : noWinner
      ? 'No Winner This Round'
      : `${winnerName} Won This Round`;

  const subline = isSelfWinner
    ? `Great round, ${nickname}. Your payout is $${state.winAmount.toFixed(2)}.`
    : noWinner
      ? 'No one completed bingo in time. Jump back in the next round.'
      : 'Stay in the lobby and join the next round quickly.';

  const details = useMemo(
    () => [
      { label: 'Matched', value: `${state.matchedCount}` },
      { label: 'Bet', value: `$${state.betAmount.toFixed(2)}` },
      { label: 'Payout', value: isSelfWinner ? `$${state.winAmount.toFixed(2)}` : '$0.00' },
      { label: 'Calls', value: `${state.calledNumbersList.length}` },
    ],
    [isSelfWinner, state.betAmount, state.calledNumbersList.length, state.matchedCount, state.winAmount],
  );

  const progressPct = Math.max(0, Math.min(100, ((AUTO_RETURN_SECONDS - secondsLeft) / AUTO_RETURN_SECONDS) * 100));

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
        <div className={`absolute -left-24 top-10 h-56 w-56 rounded-full blur-3xl ${isSelfWinner ? 'bg-emerald-500/35' : 'bg-cyan-500/25'}`} />
        <div className={`absolute -right-24 bottom-10 h-56 w-56 rounded-full blur-3xl ${isSelfWinner ? 'bg-amber-400/30' : 'bg-indigo-500/30'}`} />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-8 sm:px-6">
        <article className="w-full rounded-3xl border border-white/15 bg-white/5 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/60">Round Result</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{headline}</h1>
              <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">{subline}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                onLogout();
                dispatch({ type: 'PLAY_AGAIN' });
              }}
              className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
            >
              Logout
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {details.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/15 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/55">{item.label}</p>
                <p className="mt-1 text-xl font-black text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-white/15 bg-black/25 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-white/80">
              <span>Returning to lobby automatically</span>
              <span className="font-bold tabular-nums">{secondsLeft}s</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
              <div className={`h-full rounded-full ${isSelfWinner ? 'bg-emerald-400' : 'bg-sky-400'}`} style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => shareToTelegram(status, state.winAmount)}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-emerald-400 px-4 py-3 text-sm font-black text-slate-900 shadow-[0_10px_24px_rgba(16,185,129,0.35)]"
            >
              Share Result
            </button>
            <a
              href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-center text-sm font-bold text-white hover:bg-white/15"
            >
              Open {TELEGRAM_BOT_NAME}
            </a>
          </div>
        </article>
      </section>
    </main>
  );
}
