'use client';

import { BingoCard } from '@/types/game';
import FreeCell from '../ui/FreeCell';

interface CardSelectorProps {
  cards: BingoCard[];
  selectedIndices: number[];
  onSelect: (indices: number[]) => void;
}

export default function CardSelector({
  cards,
  selectedIndices,
  onSelect,
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

  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">Selected: {selectedIndices.length}/2</p>
        <p className="text-[11px] text-slate-500">Tap a card number to select.</p>
      </div>

      <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5">
        {cards.map((card, index) => {
          const selected = selectedIndices.includes(index);
          return (
            <article
              key={index}
              className={`select-card select-card--compact select-card--dense ${selected ? 'select-card--selected' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleCard(index)}
                  className={`text-left text-xs font-extrabold text-slate-900 transition hover:text-slate-900 ${selected ? 'underline decoration-emerald-500 decoration-2' : ''}`}
                  title="Tap to select"
                >
                  Card {index + 1}
                </button>
              </div>
              {/* Details hidden; global minimal view only */}
            </article>
          );
        })}
      </div>
    </section>
  );
}
