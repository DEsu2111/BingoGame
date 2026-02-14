// Page 3: In-game board (called numbers + player cards) kept on a single, equal-height grid.
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
    <main className="game-shell relative h-screen overflow-hidden bg-linear-to-br from-cyan-50 via-white to-amber-50 p-1 sm:p-2 md:p-3">
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

      <div className="flex h-full w-full flex-col gap-2 overflow-hidden">
        {/* Top status bar */}
        <header className="relative rounded-xl border border-slate-200 bg-white px-2 py-2 shadow-sm">
          {/* Compact quick actions anchored top-right */}
          <div className="absolute right-2 top-2 flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => dispatch({ type: 'PLAY_AGAIN' })}
              className="rounded-full bg-emerald-600 px-3 py-1 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 active:translate-y-0"
            >
              🔥 New Run
            </button>
            <button
              type="button"
              className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 font-semibold text-amber-800 shadow-inner"
            >
              🎁 Rewards
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2 flex items-center justify-between gap-3 md:gap-4">
              <div className="flex-1 rounded-lg bg-linear-to-r from-emerald-50 to-emerald-100 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Balance</p>
                <p className="text-xl font-extrabold text-emerald-900">${state.balance.toFixed(2)}</p>
              </div>
              <div className="flex-1 rounded-lg bg-linear-to-r from-sky-50 to-sky-100 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Bet</p>
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
                  {firstFiveDraws.length ? (
                    firstFiveDraws.map((num) => (
                      <span
                        key={num}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800 ring-2 ring-sky-200"
                      >
                        {num}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
              <p className="text-xl font-bold text-slate-900">
                {state.winStatus === 'none' ? (state.gameActive ? 'Playing' : 'Stopped') : state.winStatus}
              </p>
              <p className="text-[11px] text-slate-500">{tip}</p>
            </div>
          </div>
        </header>

        {/* Main grid: called numbers (left) + two selected cards (right) */}
        <div className="flex flex-1 items-stretch gap-2 overflow-hidden">
          <div className="h-full min-w-0 basis-1/2 overflow-hidden">
            <div className="flex h-full w-full">
              <CalledNumbersTable called={state.calledNumbers} currentCall={state.currentCall} cellRefs={cellRefs} />
            </div>
          </div>
          <div className="h-full min-w-0 basis-1/2 overflow-hidden">
            <div className="flex h-full w-full">
              <PlayerCards cards={state.playerCards} />
            </div>
          </div>
        </div>

        {/* Bottom sections removed per request to keep only main grid visible */}
      </div>
    </main>
  );
}
