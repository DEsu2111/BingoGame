'use client';

type HeaderProps = {
  firstFive: number[];
  countdown: number;
  lastNumber: number | null;
};

export default function Header({ firstFive, countdown, lastNumber }: HeaderProps) {
  return (
    <div className="flex h-[10vh] w-full items-center gap-2">
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
      <div className="hidden items-center gap-2 rounded-xl bg-slate-800/70 px-2.5 py-1.5 border border-slate-700">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Countdown</span>
        <span className="h-8 min-w-8 rounded-full bg-rose-400 text-slate-900 font-black grid place-items-center shadow-inner shadow-rose-500/50">
          {countdown}s
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-slate-800/70 px-2.5 py-1.5 border border-slate-700">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Call</span>
        <span className="h-8 min-w-8 rounded-full bg-amber-400 text-slate-900 font-black grid place-items-center shadow-inner shadow-amber-500/50">
          {lastNumber ?? '-'}
        </span>
      </div>
      <div className="ml-auto flex items-center rounded-xl bg-slate-800/70 px-2.5 py-1.5 border border-slate-700">
        <span className="h-8 min-w-8 rounded-full bg-rose-400 text-slate-900 font-black grid place-items-center shadow-inner shadow-rose-500/50">
          {countdown}s
        </span>
      </div>
    </div>
  );
}
