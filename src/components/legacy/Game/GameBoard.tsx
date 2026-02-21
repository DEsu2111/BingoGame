import React from 'react';
import clsx from 'clsx';
import type { BingoCard } from '@/types/game';

type Props = {
  card: BingoCard;
  marked: Set<string>;
  called: number[];
  active: boolean;
  onMark: (row: number, col: number) => void;
};

export function GameBoard({ card, marked, called, active, onMark }: Props) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {card.map((row: BingoCard[number], r: number) =>
        row.map((cell: BingoCard[number][number], c: number) => {
          const key = `${r}-${c}`;
          const isCalled = cell.value === 0 || called.includes(cell.value);
          const isMarked = marked.has(key) || (r === 2 && c === 2);
          return (
            <button
              key={key}
              disabled={!active || !isCalled}
              onClick={() => onMark(r, c)}
              className={clsx(
                'h-16 w-16 rounded-lg border text-sm font-bold transition',
                isMarked
                  ? 'bg-emerald-500 text-slate-900 border-emerald-400'
                  : 'bg-slate-800 border-slate-700',
                isCalled && !isMarked && 'ring-2 ring-amber-300',
                !active && 'opacity-60 cursor-not-allowed'
              )}
            >
              {cell.value === 0 ? 'FREE' : cell.value}
            </button>
          );
        })
      )}
    </div>
  );
}

