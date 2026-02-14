'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '@/context/GameContext';
import CalledNumbersTable from './CalledNumbersTable';
import PlayerCards from './PlayerCards';
import StatsBar from './StatsBar';
import WinBlinker from './WinBlinker';
import PlayerDashboard from './PlayerDashboard';

export default function GameBoard() {
  const { state, dispatch } = useGame();
  const [showMobileDashboard, setShowMobileDashboard] = useState(false);
  const firstFiveDraws = useMemo(() => state.calledNumbersList.slice(0, 5), [state.calledNumbersList]);
  const cellRefs = useRef<Map<number, HTMLTableCellElement>>(new Map());
  const drawRef = useRef<HTMLDivElement | null>(null);

  const tip = useMemo(() => {
    if (state.winStatus === 'win') return 'Ride the streak—lock another bet and hunt the next jackpot! 💰';
    if (state.calledNumbers.size >= 4) return 'Last chances—mark fast and watch for diagonals. 🧠';
    if (state.calledNumbers.size >= 2) return 'Momentum up! Keep your eyes on center lines. 🎯';
    return 'Tap only numbers you truly saw—precision beats speed early. 👀';
  }, [state.calledNumbers.size, state.winStatus]);

  const currentPosition = useMemo(() => {
    if (state.currentCall === null) return null;
    for (let cardIndex = 0; cardIndex < state.playerCards.length; cardIndex += 1) {
      const card = state.playerCards[cardIndex];
      for (let r = 0; r < card.length; r += 1) {
        for (let c = 0; c < card[r].length; c += 1) {
          if (card[r][c].value === state.currentCall) {
            return { cardIndex, row: r + 1, col: c + 1 };
          }
        }
      }
    }
    return null;
  }, [state.currentCall, state.playerCards]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!state.currentCall) return;
    const cell = cellRefs.current.get(state.currentCall);
    const drawEl = drawRef.current;
    if (!cell || !drawEl) return;

    const from = cell.getBoundingClientRect();
    const to = drawEl.getBoundingClientRect();
    const clone = cell.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.left = `${from.left}px`;
    clone.style.top = `${from.top}px`;
    clone.style.width = `${from.width}px`;
    clone.style.height = `${from.height}px`;
    clone.style.margin = '0';
    clone.style.zIndex = '9999';
    clone.style.transform = 'scale(1)';
    clone.style.transition = 'transform 380ms ease, opacity 380ms ease, filter 380ms ease';
    document.body.appendChild(clone);

    requestAnimationFrame(() => {
      clone.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(1.5)`;
      clone.style.opacity = '0';
      clone.style.filter = 'blur(2px)';
    });

    const cleanup = setTimeout(() => {
      clone.remove();
    }, 420);

    return () => clearTimeout(cleanup);
  }, [state.currentCall]);

  return (
    // Page 3: desktop-friendly view with full context
    <main className="relative min-h-screen bg-linear-to-br from-cyan-50 via-white to-amber-50 p-3 sm:p-4 md:p-6">
      {state.winStatus === 'win' ? <WinBlinker /> : null}

      {currentPosition ? (
        <div className="call-indicator animate-blink">
          <div className="call-indicator__grid">
            {[...Array(25)].map((_, idx) => (
              <span key={idx} className="dot" />
            ))}
          </div>
          <div className="call-indicator__label">BINGO</div>
          <div className="call-indicator__sub">
            Card {currentPosition.cardIndex + 1} · Row {currentPosition.row} · Col {currentPosition.col}
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl">
        {/* Top status bar */}
        <header className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2 flex items-center justify-between gap-3 md:gap-4">
              <div className="flex-1 rounded-lg bg-linear-to-r from-emerald-50 to-emerald-100 px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Balance</p>
                <p className="text-xl font-extrabold text-emerald-900">${state.balance.toFixed(2)}</p>
              </div>
              <div className="flex-1 rounded-lg bg-linear-to-r from-sky-50 to-sky-100 px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-sky-700 font-semibold">Bet</p>
                <p className="text-xl font-extrabold text-sky-900">${state.betAmount.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Current Draw</p>
              <div className="flex items-center gap-3">
                <div
                  ref={drawRef}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-amber-300 to-rose-400 text-xl font-extrabold text-slate-900 shadow"
                >
                  {state.currentCall ?? '—'}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">First 5:</span>
                  {firstFiveDraws.length
                    ? firstFiveDraws.map((num) => (
                        <span
                          key={num}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800 ring-2 ring-sky-200"
                        >
                          {num}
                        </span>
                      ))
                    : <span className="text-xs text-slate-500">—</span>}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
              <p className="text-xl font-bold text-slate-900">
                {state.winStatus === 'none' ? (state.gameActive ? 'Playing' : 'Stopped') : state.winStatus}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => dispatch({ type: 'FORCE_WIN' })}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:scale-95"
            >
              Try a Win
            </button>
          </div>
          {state.winStatus === 'win' ? (
            <div className="mt-3 rounded-md bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900">
              Congratulations! Confetti unlocked. 🎊
            </div>
          ) : null}
        </header>

        {/* Engagement strip */}
        <section className="engage-band mb-5 rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50/80 via-white/60 to-amber-50/80 p-4 shadow-md backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-white/80 px-3 py-2 text-xl shadow-sm">📱</span>
              <div>
                <p className="text-sm font-semibold text-emerald-800">Mobile-first flow</p>
                <p className="text-xs text-slate-700">Immersive play, quick taps, endless fun. {tip}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="pulse-glow rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 active:translate-y-0"
                onClick={() => dispatch({ type: 'PLAY_AGAIN' })}
              >
                🔥 New Run
              </button>
              <button
                type="button"
                className="rounded-full border border-amber-300 bg-white/80 px-4 py-2 text-sm font-semibold text-amber-800 shadow-inner"
              >
                🎁 Rewards Vault
              </button>
            </div>
          </div>
        </section>

        {/* Main grid: called numbers (left) + two selected cards (right) */}
        <div className="grid grid-cols-2 gap-3 items-stretch lg:grid-cols-5">
          <div className="col-span-1 lg:col-span-3 h-full">
            <CalledNumbersTable called={state.calledNumbers} currentCall={state.currentCall} cellRefs={cellRefs} />
          </div>
          <div className="col-span-1 lg:col-span-2 h-full">
            <PlayerCards cards={state.playerCards} />
          </div>
        </div>

        {/* Bottom status bar */}
        <StatsBar />

        {/* Player dashboard */}
        <div className="mt-6">
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setShowMobileDashboard((prev) => !prev)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm"
            >
              {showMobileDashboard ? 'Hide Player Dashboard' : 'Show Player Dashboard'}
            </button>
            {showMobileDashboard ? (
              <div className="mt-3">
                <PlayerDashboard />
              </div>
            ) : null}
          </div>
          <div className="hidden lg:block">
            <PlayerDashboard />
          </div>
        </div>
      </div>
    </main>
  );
}
