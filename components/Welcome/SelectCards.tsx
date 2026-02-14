// Step 2 page: choose exactly two cards before starting the game.
'use client';

import { useMemo, useState } from 'react';
import { useGame } from '@/context/GameContext';
import CardSelector from './CardSelector';

export default function SelectCards() {
  const { state, dispatch } = useGame();
  const canBegin = state.selectedCardIndices.length === 2;
  const [expanded, setExpanded] = useState<number[]>([]);
  const showAll = useMemo(
    () => state.allCards.length > 0 && expanded.length === state.allCards.length,
    [expanded.length, state.allCards.length],
  );

  const handleBegin = () => {
    if (!canBegin) return;
    dispatch({ type: 'BEGIN_DRAW' });
  };

  const toggleExpand = (index: number) => {
    setExpanded((prev) => (prev.includes(index) ? prev.filter((n) => n !== index) : [...prev, index]));
  };

  const toggleAll = () => {
    if (expanded.length === state.allCards.length) {
      setExpanded([]);
    } else {
      setExpanded(state.allCards.map((_, idx) => idx));
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-cyan-50 via-white to-amber-50 p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.16),transparent_40%),radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.15),transparent_42%)]" />
      <div className="relative mx-auto max-w-5xl space-y-4 sm:space-y-5">
        <header className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/75 px-5 py-6 shadow-xl backdrop-blur-md">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-sky-50/70 via-white/30 to-emerald-50/70" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 shadow-sm">
                <span className="text-base">🎴</span> Step 2 / 3 · Pick your duo
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Select Your 2 Cards</h1>
              <p className="text-sm sm:text-base text-slate-600">
                Quick-scan number list by default. Tap a card to select; open detail only on the one you need.
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                <span className="rounded-full bg-emerald-50 px-3 py-1">Max 2 cards</span>
                <span className="rounded-full bg-sky-50 px-3 py-1">Detail shows matrix + image</span>
                <span className="rounded-full bg-amber-50 px-3 py-1">Built for mobile & desktop</span>
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-2 text-xs font-semibold text-slate-700">
              <span className="rounded-full bg-white/70 px-3 py-2 shadow-sm">Selected: {state.selectedCardIndices.length}/2</span>
              <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-800 shadow-sm">
                Balance: ${state.balance.toFixed(2)}
              </span>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-md backdrop-blur">
          <button
            type="button"
            onClick={toggleAll}
            className="rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0"
          >
            {expanded.length === state.allCards.length ? 'Hide all details' : 'Show all details'}
          </button>
          <span className="text-xs text-slate-600">Toggle to preview every card’s grid & free-space image at once.</span>
        </div>

        <CardSelector
          cards={state.allCards}
          selectedIndices={state.selectedCardIndices}
          onSelect={(indices) => dispatch({ type: 'SELECT_CARDS', payload: indices })}
          expandedIndices={expanded}
          onToggleExpand={toggleExpand}
          showAllDetails={showAll}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-md backdrop-blur">
          <span className="text-sm font-semibold text-slate-800">
            {state.selectedCardIndices.length === 2 ? 'Locked in! Ready for the draw.' : 'Pick two cards to continue.'}
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 shadow-sm">
              Live balance: ${state.balance.toFixed(2)}
            </span>
            <button
              type="button"
              onClick={handleBegin}
              disabled={!canBegin}
              className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-500 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Start to play 🚦
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
