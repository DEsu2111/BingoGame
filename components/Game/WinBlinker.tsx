'use client';

import { useEffect, useState } from 'react';

export default function WinBlinker() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setOn((value) => !value), 260);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed left-1/2 top-4 z-20 -translate-x-1/2 rounded-lg border border-amber-300 bg-amber-100/95 p-2 shadow-lg">
      <div className="grid grid-cols-5 gap-0.5">
        {Array.from({ length: 25 }).map((_, index) => (
          <span
            key={index}
            className={`h-3 w-3 rounded-sm border border-amber-500 ${on ? 'bg-amber-500' : 'bg-amber-200'}`}
          />
        ))}
      </div>
      <p className="mt-1 text-center text-xs font-bold text-amber-900">BINGO</p>
      <p className="text-center text-[11px] text-amber-800">flowers confetti</p>
    </div>
  );
}
