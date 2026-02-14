'use client';

import { BingoCard } from '@/types/game';
import FreeCell from '../ui/FreeCell';

interface CardSelectorProps {
  cards: BingoCard[];
  selectedIndices: number[];
  onSelect: (indices: number[]) => void;
  expandedIndices: number[];
  onToggleExpand: (index: number) => void;
  showAllDetails: boolean;
}

export default function CardSelector({
  cards,
  selectedIndices,
  onSelect,
  expandedIndices,
  onToggleExpand,
  showAllDetails,
}: CardSelectorProps) {
  const toggleCard = (index: number) => {
    if (selectedIndices.includes(index)) {
      onSelect(selectedIndices.filter((selectedIndex) => selectedIndex !== index));
      return;
    }

    if (selectedIndices.length < 2) {
      onSelect([...selectedIndices, index]);
    }
  };

  const isExpanded = (index: number) => showAllDetails || expandedIndices.includes(index);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Selected: {selectedIndices.length}/2</p>
        <p className="text-xs text-slate-500">Tap a card number to select; “View detail” opens its grid.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {cards.map((card, index) => {
          const selected = selectedIndices.includes(index);
          const expanded = isExpanded(index);
          return (
            <article
              key={index}
              className={`rounded-lg border border-slate-200 bg-white p-2 shadow-sm transition`}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleCard(index)}
                  className={`text-left text-sm font-extrabold text-slate-900 transition hover:text-slate-900 ${selected ? 'underline decoration-emerald-500 decoration-2' : ''}`}
                  title="Tap to select"
                >
                  Card {index + 1}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleExpand(index)}
                  className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-800 hover:bg-sky-100"
                  title="View card matrix + images"
                >
                  {expanded ? 'Hide detail' : 'View detail'}
                </button>
              </div>
              {expanded ? (
                <div className="mt-2">
                  <div className="bingo-card">
                    <div className="bingo-head">
                      <span className="bingo-b">B</span>
                      <span className="bingo-i">I</span>
                      <span className="bingo-n">N</span>
                      <span className="bingo-g">G</span>
                      <span className="bingo-o">O</span>
                    </div>
                    <div className="bingo-grid">
                      {card.flat().map((cell, cellIndex) => (
                        <div
                          key={cellIndex}
                          className={`bingo-cell ${cell.value === 0 ? 'bingo-free' : ''}`}
                        >
                          {cell.value === 0 ? <FreeCell /> : cell.value}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
