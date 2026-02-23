/**
 * CalledNumbersTable.tsx — 75-Number Grid Display
 *
 * Displays all 75 bingo numbers (1–75) in a grid with B-I-N-G-O headers.
 * Numbers are displayed in a deterministic pseudo-random order (shuffled
 * based on how many numbers have been called, so the layout subtly shifts
 * each draw to keep the UI feeling alive).
 *
 * Visual states:
 *   - Called: green highlight (cell-called)
 *   - Not called: dim grey (cell-uncalled)
 *   - Current call: pulsing amber (cell-current)
 *   - Full row: success flash animation (row-success-flash)
 */
'use client';

import React, { MutableRefObject, useMemo } from 'react';

// ─── Props ──────────────────────────────────────────────

interface CalledNumbersTableProps {
  called: Set<number>;               // Set of all called numbers
  currentCall?: number | null;       // The number that was just called
  cellRefs?: MutableRefObject<Map<number, HTMLTableCellElement>>;  // Optional ref map for animations
}

// ─── Helpers ────────────────────────────────────────────

/**
 * A simple hash function for deterministic pseudo-random ordering.
 * Uses a variant of the Knuth multiplicative hash to produce
 * a stable sort order that changes when `seed` changes.
 */
function hashOrder(value: number, seed: number) {
  return ((value * 2654435761 + seed * 1013904223) >>> 0) % 100000;
}

// ─── Component ──────────────────────────────────────────

const CalledNumbersTable = React.memo(({ called, currentCall = null, cellRefs }: CalledNumbersTableProps) => {
  // Seed changes with each new call, causing numbers to re-shuffle
  const seed = called.size + 1;

  // Generate all 75 numbers in a pseudo-random order (stable per seed)
  const numbers = useMemo(() => {
    const base = Array.from({ length: 75 }, (_, i) => i + 1).sort(
      (a, b) => hashOrder(a, seed) - hashOrder(b, seed),
    );
    return base;
  }, [seed]);

  // Split into rows of 5 for the table layout
  const rows = useMemo(() => {
    const r: number[][] = [];
    for (let i = 0; i < numbers.length; i += 5) {
      const slice = numbers.slice(i, i + 5);
      while (slice.length < 5) slice.push(0); // Pad short rows
      r.push(slice);
    }
    return r;
  }, [numbers]);

  const lastCalled = currentCall;

  return (
    <section
      className="relative flex h-full w-full flex-col rounded-2xl border border-white/10 bg-slate-900/70 p-0 shadow-2xl backdrop-blur-xl"
      aria-label="Bingo number grid"
    >

      <div className="flex-1 overflow-hidden">
        <table className="h-full w-full border-collapse text-center text-sm" role="grid">
          {/* B-I-N-G-O column headers */}
          <thead>
            <tr role="row">
              {['B', 'I', 'N', 'G', 'O'].map((letter) => (
                <th
                  key={letter}
                  role="columnheader"
                  className="sticky top-0 z-10 bg-slate-900/80 p-0 text-[11px] font-bold uppercase tracking-widest text-slate-300 backdrop-blur"
                >
                  {letter}
                </th>
              ))}
            </tr>
          </thead>

          {/* Number grid */}
          <tbody role="rowgroup">
            {rows.map((row, rowIndex) => {
              // Check if every number in this row has been called
              const rowComplete = row.every((v) => v === 0 || called.has(v));
              return (
                <tr key={rowIndex} className={rowComplete ? 'row-success-flash' : ''} role="row">
                  {row.map((value, colIndex) => {
                    if (value === 0) {
                      return null; // Skip padding cells
                    }
                    const hit = called.has(value);
                    const isCurrent = currentCall !== null && currentCall === value;
                    const delay = (rowIndex * 5 + colIndex) * 6; // Staggered animation delay

                    return (
                      <td
                        key={value}
                        role="gridcell"
                        aria-selected={hit}
                        aria-label={`Number ${value}, ${hit ? 'called' : 'not called'}${isCurrent ? ', current call' : ''}`}
                        ref={(el) => {
                          if (el && cellRefs?.current) cellRefs.current.set(value, el);
                        }}
                        className="p-0"
                      >
                        <div
                          className={`cell ${hit ? 'cell-called' : 'cell-uncalled'} ${isCurrent ? 'cell-current' : ''} ${lastCalled === value ? 'cell-last' : ''
                            }`}
                          style={{ animationDelay: `${delay}ms` }}
                          aria-hidden="true"
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

      {/* Legend bar at the bottom */}
      <div className="flex flex-wrap items-center gap-2 px-1 py-1 text-xs text-slate-300" role="note">
        <span className="legend-dot bg-emerald-400" aria-hidden="true" /> <span>Called</span>
        <span className="legend-dot bg-slate-500" aria-hidden="true" /> <span>Not called</span>
        <span className="legend-dot border border-dashed border-slate-500" aria-hidden="true" /> <span>Placeholder</span>
        <span className="ml-3 rounded-full bg-amber-400/20 px-2 py-1 font-semibold text-amber-200">
          Current: {currentCall ?? '-'}
        </span>
      </div>
    </section>
  );
});

CalledNumbersTable.displayName = 'CalledNumbersTable';

export default CalledNumbersTable;
