// Randomized list of all 75 numbers, highlighting those already drawn.
'use client';

import { MutableRefObject, useMemo } from 'react';

interface CalledNumbersTableProps {
  called: Set<number>;
  currentCall?: number | null;
  cellRefs?: MutableRefObject<Map<number, HTMLTableCellElement>>;
}

function hashOrder(value: number, seed: number) {
  // Simple deterministic mix for stable pseudo-random ordering
  return ((value * 2654435761 + seed * 1013904223) >>> 0) % 100000;
}

export default function CalledNumbersTable({ called, currentCall = null, cellRefs }: CalledNumbersTableProps) {
  const seed = called.size + 1;

  const numbers = useMemo(() => {
    const base = Array.from({ length: 75 }, (_, i) => i + 1).sort(
      (a, b) => hashOrder(a, seed) - hashOrder(b, seed),
    );
    return base;
  }, [called, seed]);

  const rows: number[][] = [];
  for (let i = 0; i < numbers.length; i += 5) {
    const slice = numbers.slice(i, i + 5);
    while (slice.length < 5) slice.push(0); // pad for layout when filtering
    rows.push(slice);
  }

  const lastCalled = currentCall;

  return (
    <section className="relative flex h-full w-full flex-col rounded-2xl border border-white/10 bg-slate-900/70 p-0 shadow-2xl backdrop-blur-xl">


      <div className="flex-1 overflow-hidden">
        <table className="h-full w-full border-collapse text-center text-sm">
          <thead>
            <tr>
              {['B', 'I', 'N', 'G', 'O'].map((letter) => (
                <th
                  key={letter}
                  className="sticky top-0 z-10 bg-slate-900/80 p-0 text-[11px] font-bold uppercase tracking-widest text-slate-300 backdrop-blur"
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
                      return null;
                    }
                    const hit = called.has(value);
                    const isCurrent = currentCall !== null && currentCall === value;
                    const delay = (rowIndex * 5 + colIndex) * 6; // faster stagger
                    return (
                      <td
                        key={value}
                        ref={(el) => {
                          if (el && cellRefs?.current) cellRefs.current.set(value, el);
                        }}
                        className="p-0"
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

      <div className="flex flex-wrap items-center gap-2 px-1 py-1 text-xs text-slate-300">
        <span className="legend-dot bg-emerald-400" /> <span>Called</span>
        <span className="legend-dot bg-slate-500" /> <span>Not called</span>
        <span className="legend-dot border border-dashed border-slate-500" /> <span>Placeholder</span>
        <span className="ml-3 rounded-full bg-amber-400/20 px-2 py-1 font-semibold text-amber-200">
          Current: {currentCall ?? '-'}
        </span>
      </div>
    </section>
  );
}


