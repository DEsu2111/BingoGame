/**
 * MiniCard.tsx — Single Bingo Card Component
 *
 * Renders a 5×5 bingo card with interactive cells. Each cell can be:
 *   - Unmarked: default state, clickable
 *   - Marked (daubed): green highlight, no longer clickable
 *   - Current call: pulsing highlight to draw attention
 *   - FREE: center cell, always marked, displays a star icon
 *   - Row/column hint: subtle highlight when the current call
 *     is in the same row or column (helps players spot matches)
 *
 * The card has a B-I-N-G-O header row above the 5×5 grid.
 */
'use client';

import { useMemo } from 'react';
import { BingoCard } from '@/types/game';
import FreeCell from '../ui/FreeCell';

// ─── Props ──────────────────────────────────────────────

interface MiniCardProps {
  card: BingoCard;                    // The 5×5 card data
  currentCall: number | null;         // Number that was just called
  onCellClick: (row: number, col: number) => void;  // Called when a cell is tapped
  disabled: boolean;                   // If true, no cells can be clicked
}

// ─── Component ──────────────────────────────────────────

export default function MiniCard({ card, currentCall, onCellClick, disabled }: MiniCardProps) {
  /**
   * Find the row/col position of the current call on this card.
   * Used to highlight the matching row and column as visual hints.
   * Returns null if the current call is not on this card.
   */
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
      {/* B-I-N-G-O header */}
      <div className="bingo-head">
        <span className="bingo-b">B</span>
        <span className="bingo-i">I</span>
        <span className="bingo-n">N</span>
        <span className="bingo-g">G</span>
        <span className="bingo-o">O</span>
      </div>

      {/* 5×5 grid of cells */}
      <div className="bingo-grid">
        {card.map((row, r) =>
          row.map((cell, c) => {
            const free = cell.value === 0;        // Center cell (FREE)
            const isCurrent = currentCall !== null && cell.value === currentCall && !cell.marked && !free;
            const rowHint = matchCoords && matchCoords.r === r;  // Same row as current call
            const colHint = matchCoords && matchCoords.c === c;  // Same col as current call

            // Build CSS class list dynamically
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
                disabled={disabled || free || cell.marked}  // Can't click FREE or already-marked cells
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
