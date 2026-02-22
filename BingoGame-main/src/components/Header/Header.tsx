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
  const [popout, setPopout] = React.useState(false);

  React.useEffect(() => {
    if (lastNumber !== null) {
      setPopout(true);
      const timer = setTimeout(() => setPopout(false), 300);
      return () => clearTimeout(timer);
    }
  }, [lastNumber]);

  return (
    <div className="flex h-[10vh] w-full items-center gap-2" role="banner">

      {/* First 5 called numbers — helps players quickly see early calls */}
      <div
        className="flex items-center gap-2 rounded-xl bg-slate-800/70 px-2.5 py-1.5 border border-slate-700"
        aria-label={`First five numbers: ${firstFive.join(', ') || 'none yet'}`}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300" aria-hidden="true">First 5</span>
        <div className="flex items-center gap-1">
          {firstFive.map((n) => (
            <span
              key={n}
              className="h-8 min-w-8 rounded-full bg-amber-300 text-slate-900 font-bold grid place-items-center shadow-inner shadow-amber-500/40"
            >
              {n}
            </span>
          ))}
        </div>
      </div>

      {/* Current call — the number that was just drawn */}
      <div
        className="flex items-center gap-2 rounded-xl bg-slate-800/70 px-2.5 py-1.5 border border-slate-700"
        aria-live="assertive"
        aria-label={`Current call: ${lastNumber ?? 'none'}`}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300" aria-hidden="true">Call</span>
        <span
          className={`h-8 min-w-8 rounded-full bg-amber-400 text-slate-900 font-black grid place-items-center shadow-inner transition-all duration-300 ease-out ${popout ? 'scale-150 rotate-3 shadow-[0_0_15px_rgba(251,191,36,1)]' : 'scale-100 shadow-amber-500/50'
            }`}
        >
          {lastNumber ?? '-'}
        </span>
      </div>

      {/* Right-aligned countdown timer */}
      <div
        className="ml-auto flex items-center rounded-xl bg-slate-800/70 px-2.5 py-1.5 border border-slate-700"
        aria-label={`Time remaining: ${countdown} seconds`}
        aria-live="polite"
      >
        <span className="h-8 min-w-8 rounded-full bg-rose-400 text-slate-900 font-black grid place-items-center shadow-inner shadow-rose-500/50">
          {countdown}s
        </span>
      </div>
    </div>
  );
});

export default Header;
