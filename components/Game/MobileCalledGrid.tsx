'use client';

import { useMemo, useState } from 'react';

interface MobileCalledGridProps {
  called: Set<number>;
  currentCall: number | null;
}

function hashOrder(value: number, seed: number) {
  return ((value * 2654435761 + seed * 1013904223) >>> 0) % 100000;
}

export default function MobileCalledGrid({ called, currentCall }: MobileCalledGridProps) {
  const [mode, setMode] = useState<'all' | 'remaining'>('all');
  const seed = called.size + 1;

  const numbers = useMemo(() => {
    const base = Array.from({ length: 75 }, (_, i) => i + 1).sort(
      (a, b) => hashOrder(a, seed) - hashOrder(b, seed),
    );
    return mode === 'remaining' ? base.filter((n) => !called.has(n)) : base;
  }, [called, mode, seed]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="pill-toggle" role="group" aria-label="Filter numbers mobile">
          <button type="button" onClick={() => setMode('all')} className={`pill-segment ${mode === 'all' ? 'pill-active' : ''}`}>
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
        <span className="text-[11px] font-semibold text-slate-200">
          {called.size}/75
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {numbers.map((value, idx) => {
          const hit = called.has(value);
          const isCurrent = currentCall === value;
          return (
            <button
              key={value}
              type="button"
              className={`mobile-cell ${hit ? 'mobile-cell--hit' : 'mobile-cell--idle'} ${isCurrent ? 'mobile-cell--current' : ''}`}
              style={{ animationDelay: `${idx * 10}ms` }}
            >
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
}
