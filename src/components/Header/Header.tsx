/**
 * Header.tsx — Game Status Strip
 *
 * Displays a horizontal bar at the top of the game screen with:
 *   - The first 5 called numbers (golden badges)
 *   - The current call number
 *   - A countdown timer (visible during transitions)
 *
 * This is a pure presentational component — no internal state.
 */
'use client';

import React from 'react';

// ─── Props ──────────────────────────────────────────────

type HeaderProps = {
  firstFive: number[];       // The first 5 numbers called this round
  countdown: number;          // Seconds remaining (displayed on the right)
  lastNumber: number | null;  // The most recently called number
};

// ─── Component ──────────────────────────────────────────

const Header = React.memo(({ firstFive, countdown, lastNumber }: HeaderProps) => {
  return (
    <div className="grid h-[10vh] w-full grid-cols-[1fr_auto] items-center gap-2 p-1" role="banner">
      {/* First 5 called numbers — helps players quickly see early calls */}
      <div
        className="flex min-w-0 items-center gap-1 rounded-xl border border-slate-700 bg-slate-800/70 px-2 py-1.5"
        aria-label={`First five numbers: ${firstFive.join(', ') || 'none yet'}`}
      >
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300" aria-hidden="true">First 5</span>
        <div className="flex min-w-0 items-center gap-1 overflow-hidden">
          {firstFive.map((n) => (
            <span
              key={n}
              className="h-8 min-w-8 rounded-full bg-amber-200 text-slate-900 font-bold grid place-items-center shadow-inner shadow-amber-500/40"
            >
              {n}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Current call — the number that was just drawn */}
        <div
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-2.5 py-1.5"
          aria-live="assertive"
          aria-label={`Current call: ${lastNumber ?? 'none'}`}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300" aria-hidden="true">Last Call</span>
          <span className="h-9 min-w-9 rounded-full bg-gradient-to-br from-amber-100 to-amber-300 text-slate-900 font-black grid place-items-center shadow-[0_0_20px_rgba(251,191,36,0.45)]">
            {lastNumber ?? '-'}
          </span>
        </div>

        {/* Right-aligned countdown timer */}
        <div
          className="hidden items-center rounded-xl border border-slate-700 bg-slate-800/70 px-2 py-1.5 sm:flex"
          aria-label={`Time remaining: ${countdown} seconds`}
          aria-live="polite"
        >
          <span className="h-8 min-w-8 rounded-full bg-rose-400 text-slate-900 font-black grid place-items-center shadow-inner shadow-rose-500/50">
            {countdown}s
          </span>
        </div>
      </div>
    </div>
  );
});

Header.displayName = 'Header';

export default Header;
