// Bottom status bar with win/loss messaging and Play Again control.
'use client';

import { useState } from 'react';
import { useGame } from '@/context/GameContext';

export default function StatsBar() {
  const { state, dispatch } = useGame();
  const [open, setOpen] = useState(false);

  const wins = state.results.filter((result) => result.type === 'win').length;
  const losses = state.results.filter((result) => result.type === 'loss').length;
  const recent = state.results[0];

  const message =
    state.winStatus === 'win'
      ? `Congratulations! You won $${state.winAmount.toFixed(2)}.`
      : state.winStatus === 'loss'
        ? `You matched ${state.matchedCount} numbers. Better luck next round.`
        : 'Game in progress. Keep marking called numbers manually.';

  return (
    <footer className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:justify-center">
        <p className="text-sm font-semibold text-slate-800">{message}</p>
        <button
          type="button"
          onClick={() => dispatch({ type: 'PLAY_AGAIN' })}
          className="rounded-md bg-linear-to-r from-slate-900 to-slate-700 px-4 py-2 text-sm font-semibold text-white hover:from-slate-800 hover:to-slate-600 active:scale-95"
        >
          Play Again
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs md:grid-cols-5">
        <div className="rounded-lg bg-linear-to-r from-emerald-50 to-emerald-100 px-2.5 py-1.5 font-semibold text-emerald-800 shadow-sm">
          Balance: ${state.balance.toFixed(2)}
        </div>
        <div className="rounded-lg bg-linear-to-r from-sky-50 to-sky-100 px-2.5 py-1.5 font-semibold text-sky-800 shadow-sm">
          Bet: ${state.betAmount.toFixed(2)}
        </div>
        <div className="rounded-lg bg-linear-to-r from-blue-50 to-blue-100 px-2.5 py-1.5 font-semibold text-blue-800 shadow-sm">
          Wins: {wins}
        </div>
        <div className="rounded-lg bg-linear-to-r from-rose-50 to-rose-100 px-2.5 py-1.5 font-semibold text-rose-800 shadow-sm">
          Losses: {losses}
        </div>
        <div className="rounded-lg bg-linear-to-r from-amber-50 to-amber-100 px-2.5 py-1.5 font-semibold text-amber-800 shadow-sm">
          Called: {state.calledNumbers.size}/75
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center">
        {!recent ? (
          <p className="text-[11px] text-slate-600">No rounds finished yet.</p>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold shadow-md transition ${recent.type === 'win' ? 'bg-emerald-500 text-emerald-950' : 'bg-rose-500 text-rose-50'} ${open ? 'ring-2 ring-offset-2 ring-amber-400 ring-offset-white' : ''}`}
              title="Recent result"
            >
              {recent.type === 'win' ? 'W' : 'L'}
            </button>

            {open ? (
              <div className="absolute left-1/2 top-11 z-20 w-44 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2 text-[11px] shadow-lg">
                <div className="flex items-center justify-between font-semibold">
                  <span>{recent.type === 'win' ? 'Win' : 'Loss'}</span>
                  <span>${recent.payout.toFixed(2)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-600">
                  <span>Bet ${recent.betAmount.toFixed(2)}</span>
                  <span>Matched {recent.matchedCount}</span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </footer>
  );
}
