// Randomized list of all 75 numbers, highlighting those already drawn.
'use client';

import { MutableRefObject, useMemo, useState } from 'react';

interface CalledNumbersTableProps {
  called: Set<number>;
  currentCall: number | null;
  cellRefs: MutableRefObject<Map<number, HTMLTableCellElement>>;
}

function hashOrder(value: number, seed: number) {
  // Simple deterministic mix for stable pseudo-random ordering
  return ((value * 2654435761 + seed * 1013904223) >>> 0) % 100000;
}

export default function CalledNumbersTable({ called, currentCall, cellRefs }: CalledNumbersTableProps) {
  const [mode, setMode] = useState<'all' | 'remaining'>('all');
  const seed = called.size + 1;

  const numbers = useMemo(() => {
    const base = Array.from({ length: 75 }, (_, i) => i + 1).sort(
      (a, b) => hashOrder(a, seed) - hashOrder(b, seed),
    );
    if (mode === 'remaining') {
      return base.filter((num) => !called.has(num));
    }
    return base;
  }, [called, mode, seed]);

  const rows: number[][] = [];
  for (let i = 0; i < numbers.length; i += 5) {
    const slice = numbers.slice(i, i + 5);
    while (slice.length < 5) slice.push(0); // pad for layout when filtering
    rows.push(slice);
  }

  const progress = Math.round((called.size / 75) * 100);
  const lastCalled = currentCall;

  return (
    <section className="relative flex h-full flex-col rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl backdrop-blur-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Bingo Command Center</p>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-50">
            Numbers Live
            <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-200">Live</span>
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100 shadow-inner">
            {called.size}/75 · {progress}%
          </div>
          <div className="pill-toggle" role="group" aria-label="Filter numbers">
            <button
              type="button"
              onClick={() => setMode('all')}
              className={`pill-segment ${mode === 'all' ? 'pill-active' : ''}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setMode('remaining')}
              className={`pill-segment ${mode === 'remaining' ? 'pill-active' : ''}`}
            >
              Remaining
            </button>
            <span className={`pill-slider ${mode === 'remaining' ? 'translate-x-full' : ''}`} />
          </div>
        </div>
      </div>

      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-800/60">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-sky-400 via-emerald-400 to-emerald-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-center text-sm">
          <thead>
            <tr>
              {['B', 'I', 'N', 'G', 'O'].map((letter) => (
                <th
                  key={letter}
                  className="sticky top-0 z-10 bg-slate-900/80 px-2 py-1 text-xs font-bold uppercase tracking-[0.1em] text-slate-300 backdrop-blur"
                >
                  {letter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const rowComplete = row.every((v) => v === 0 || called.has(v));
              return (
                <tr key={rowIndex} className={rowComplete ? 'row-success-flash' : ''}>
                  {row.map((value, colIndex) => {
                    if (value === 0) {
                      return (
                        <td
                          key={`blank-${rowIndex}-${colIndex}`}
                          className="px-2 py-2"
                          aria-hidden
                        >
                          <div className="cell ghost" />
                        </td>
                      );
                    }
                    const hit = called.has(value);
                    const isCurrent = currentCall !== null && currentCall === value;
                    const delay = (rowIndex * 5 + colIndex) * 12; // stagger
                    return (
                      <td
                        key={value}
                        ref={(el) => {
                          if (el) cellRefs.current.set(value, el);
                        }}
                        className="px-2 py-2"
                      >
                        <div
                          className={`cell ${hit ? 'cell-called' : 'cell-uncalled'} ${isCurrent ? 'cell-current' : ''} ${
                            lastCalled === value ? 'cell-last' : ''
                          }`}
                          style={{ animationDelay: `${delay}ms` }}
                        >
                          {value}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <span className="legend-dot bg-emerald-400" /> <span>Called</span>
        <span className="legend-dot bg-slate-500" /> <span>Not called</span>
        <span className="legend-dot border border-dashed border-slate-500" /> <span>Placeholder</span>
        <span className="ml-3 rounded-full bg-amber-400/20 px-2 py-1 font-semibold text-amber-200">
          Current: {currentCall ?? '—'}
        </span>
      </div>
    </section>
  );
}
