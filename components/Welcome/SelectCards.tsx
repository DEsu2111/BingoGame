// Step 2: mobile-first, no-scroll selection screen.
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
    <main className="relative h-screen overflow-hidden bg-slate-950 text-slate-50 p-3">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.14),transparent_45%),radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.14),transparent_45%)]" />
      <div className="relative mx-auto flex h-full max-w-4xl flex-col gap-3">
        {/* Top bar */}
        <header className="flex items-center justify-between rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-[11px] font-semibold backdrop-blur">
          <span className="inline-flex items-center gap-2 text-emerald-200">
            <span className="text-sm">🎴</span> Step 2 · Pick your duo
          </span>
          <span className="text-white/80">Selected {state.selectedCardIndices.length}/2</span>
        </header>

        {/* Toggle strip */}
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAll}
              className="rounded-full border border-slate-200 bg-slate-900 px-3 py-1 text-[11px] font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0"
            >
              {expanded.length === state.allCards.length ? 'Hide all details' : 'Show all details'}
            </button>
            <span className="text-[11px] text-white/70">Numbers first; open details only when needed.</span>
          </div>
          <span className="text-[11px] text-white/70">Balance ${state.balance.toFixed(2)}</span>
        </div>

        {/* Card rail */}
        <div className="flex-1 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur">
          <div className="flex h-full flex-row gap-2 overflow-x-auto pb-1 no-scrollbar snap-x snap-mandatory">
            <div className="flex min-w-full snap-start flex-col gap-2">
              <CardSelector
                cards={state.allCards}
                selectedIndices={state.selectedCardIndices}
                onSelect={(indices) => dispatch({ type: 'SELECT_CARDS', payload: indices })}
                expandedIndices={expanded}
                onToggleExpand={toggleExpand}
                showAllDetails={showAll}
              />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs backdrop-blur">
          <span className="text-[11px] text-white/70">
            {state.selectedCardIndices.length === 2 ? 'Ready to draw.' : 'Pick two cards.'}
          </span>
          <button
            type="button"
            onClick={handleBegin}
            disabled={!canBegin}
            className="rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-bold text-slate-950 shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-white"
          >
            {canBegin ? 'Start Game →' : 'Select 2'}
          </button>
        </div>
      </div>
    </main>
  );
}
