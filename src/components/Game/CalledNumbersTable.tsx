/**
 * CalledNumbersTable.tsx — 75-Number Grid Display
 *
 * Displays all 75 bingo numbers (1–75) in a grid with B-I-N-G-O headers.
 * Numbers are displayed in fixed numeric order (1→75) so players
 * can quickly locate cells on small screens.
 *
 * Visual states:
 *   - Called: green highlight (cell-called)
 *   - Not called: dim grey (cell-uncalled)
 *   - Current call: pulsing amber (cell-current)
 *   - Full row: success flash animation (row-success-flash)
 */
'use client';

import React, { MutableRefObject } from 'react';

// ─── Props ──────────────────────────────────────────────

interface CalledNumbersTableProps {
  called: Set<number>;               // Set of all called numbers
  currentCall?: number | null;       // The number that was just called
  cellRefs?: MutableRefObject<Map<number, HTMLTableCellElement>>;  // Optional ref map for animations
}

// ─── Component ──────────────────────────────────────────

const CalledNumbersTable = React.memo(({ called, currentCall = null }: CalledNumbersTableProps) => {
  // Generate all 75 numbers sequentially (1...75)
  const numbers = Array.from({ length: 75 }, (_, i) => i + 1);

  // Get first 5 for the special top circles (latest 5 or first 5 based on UX, using slice(0,5) for 'first 5' as per user UI)
  const firstFive = Array.from(called).slice(0, 5);

  return (
    <section className="called-table-shell flex flex-col h-full rounded-2xl overflow-hidden">
      {/* Header Area with First 5 and Ball info */}
      <div className="called-table-head p-2.5 border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-300 font-black mb-1.5 px-0.5">First 5</span>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
                    ${firstFive[idx] ? 'bg-[#f6f2da] text-slate-900 shadow-[0_0_12px_rgba(255,235,120,0.4)] scale-100' : 'bg-slate-800/50 border border-white/10 text-white/5 scale-90'}`}
                >
                  {firstFive[idx] || ''}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Central Ball Indicator (Matching screenshot) */}
        <div className="flex justify-center my-3">
          <div className="relative group">
            <div className="absolute -inset-2 bg-amber-400 opacity-20 blur-xl rounded-full animate-pulse"></div>
            <div className="relative w-28 h-12 bg-amber-400 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(245,158,11,0.4)] border-b-4 border-amber-600/30">
              <div className="bg-slate-900 text-white w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black mr-2.5 shadow-inner">
                <span className="opacity-70">8</span>
              </div>
              <span className="text-slate-900 font-[900] text-2xl tracking-tighter drop-shadow-sm">
                {currentCall || '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sequential 75-Number Grid */}
      <div className="called-table-grid flex-1 overflow-y-auto p-2 scrollbar-hide">
        <div className="grid grid-cols-5 gap-1.5">
          {numbers.map((num) => {
            const hit = called.has(num);
            const isLast = currentCall === num;
            return (
              <div
                key={num}
                className={`cell transition-all duration-200 ${hit ? 'cell-called' : 'cell-uncalled'} ${isLast ? 'cell-last animate-pulse' : ''}`}
                style={{ fontSize: '14px' }}
              >
                {num}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

CalledNumbersTable.displayName = 'CalledNumbersTable';

export default CalledNumbersTable;
