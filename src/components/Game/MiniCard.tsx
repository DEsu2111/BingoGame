'use client';

import { useMemo } from 'react';
import { BingoCard } from '@/types/game';
import FreeCell from '../ui/FreeCell';

interface MiniCardProps {
  card: BingoCard;
  currentCall: number | null;
  onCellClick: (row: number, col: number) => void;
  disabled: boolean;
}

export default function MiniCard({ card, currentCall, onCellClick, disabled }: MiniCardProps) {
  const matchCoords = useMemo(() => {
    if (currentCall === null) return null;
    for (let r = 0; r < card.length; r += 1) {
      for (let c = 0; c < card[r].length; c += 1) {
        if (card[r][c].value === currentCall) return { r, c };
      }
    }
    return null;
  }, [card, currentCall]);

  return (
    <div className="bingo-card">
      <div className="bingo-head">
        <span className="bingo-b">B</span>
        <span className="bingo-i">I</span>
        <span className="bingo-n">N</span>
        <span className="bingo-g">G</span>
        <span className="bingo-o">O</span>
      </div>
      <div className="bingo-grid">
        {card.map((row, r) =>
          row.map((cell, c) => {
            const free = cell.value === 0;
            const isCurrent = currentCall !== null && cell.value === currentCall && !cell.marked && !free;
            const rowHint = matchCoords && matchCoords.r === r;
            const colHint = matchCoords && matchCoords.c === c;
            const base = [
              'bingo-cell number-cell',
              free && 'bingo-free',
              cell.marked && 'bingo-marked bingo-daub',
              isCurrent && 'bingo-current bingo-daub--pulse',
              disabled && 'bingo-disabled',
              rowHint && 'bingo-row-hint',
              colHint && 'bingo-col-hint',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                className={base}
                onClick={() => onCellClick(r, c)}
                disabled={disabled || free || cell.marked}
              >
                {free ? <FreeCell /> : cell.value}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
