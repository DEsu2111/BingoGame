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

// ─── Props ──────────────────────────────────────────────

type HeaderProps = {
  firstFive: number[];       // The first 5 numbers called this round
  countdown: number;          // Seconds remaining (displayed on the right)
  lastNumber: number | null;  // The most recently called number
};

// ─── Component ──────────────────────────────────────────

export default function Header({ firstFive, countdown, lastNumber }: HeaderProps) {
  return (
    <div className="flex h-[10vh] w-full items-center gap-2">

      {/* First 5 called numbers — helps players quickly see early calls */}
      <div className="flex items-center gap-2 rounded-xl bg-slate-800/70 px-2.5 py-1.5 border border-slate-700">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">First 5</span>
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

      {/* Hidden countdown (reserved for future use or specific phases) */}
      <div className="hidden items-center gap-2 rounded-xl bg-slate-800/70 px-2.5 py-1.5 border border-slate-700">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Countdown</span>
        <span className="h-8 min-w-8 rounded-full bg-rose-400 text-slate-900 font-black grid place-items-center shadow-inner shadow-rose-500/50">
          {countdown}s
        </span>
      </div>

      {/* Current call — the number that was just drawn */}
      <div className="flex items-center gap-2 rounded-xl bg-slate-800/70 px-2.5 py-1.5 border border-slate-700">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Call</span>
        <span className="h-8 min-w-8 rounded-full bg-amber-400 text-slate-900 font-black grid place-items-center shadow-inner shadow-amber-500/50">
          {lastNumber ?? '-'}
        </span>
      </div>

      {/* Right-aligned countdown timer */}
      <div className="ml-auto flex items-center rounded-xl bg-slate-800/70 px-2.5 py-1.5 border border-slate-700">
        <span className="h-8 min-w-8 rounded-full bg-rose-400 text-slate-900 font-black grid place-items-center shadow-inner shadow-rose-500/50">
          {countdown}s
        </span>
      </div>
    </div>
  );
}
