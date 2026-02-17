'use client';

import { BingoCard } from '@/types/game';
import FreeCell from '../ui/FreeCell';

interface CardSelectorProps {
  cards: BingoCard[];
  selectedIndices: number[];
  onSelect: (indices: number[]) => void;
  takenSlots?: number[];
  onReserve?: (slots: number[]) => void;
  onRelease?: (slots: number[]) => void;
}

export default function CardSelector({
  cards,
  selectedIndices,
  onSelect,
  takenSlots = [],
  onReserve,
  onRelease,
}: CardSelectorProps) {
  const toggleCard = (index: number) => {
    const isTaken = takenSlots.includes(index + 1) && !selectedIndices.includes(index);
    if (isTaken) return;

    if (selectedIndices.includes(index)) {
      onRelease?.([index + 1]);
      onSelect(selectedIndices.filter((selectedIndex) => selectedIndex !== index));
      return;
    }

    if (selectedIndices.length < 2) {
      onReserve?.([index + 1]);
      onSelect([...selectedIndices, index]);
    }
  };

  return (
    <section className="space-y-2 text-white">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white">Selected: {selectedIndices.length}/2</p>
        <p className="text-[11px] text-slate-200">Tap a number to select.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
        {cards.map((card, index) => {
          const selected = selectedIndices.includes(index);
          const taken = takenSlots.includes(index + 1) && !selected;
          return (
            <article
              key={index}
              className={`select-card select-card--compact select-card--dense bg-white/10 border border-white/20 text-white ${selected ? 'select-card--selected' : ''} ${taken ? 'select-card--taken opacity-80 cursor-not-allowed' : ''}`}
            >
              <button
                type="button"
                onClick={() => toggleCard(index)}
                disabled={taken}
                className={`w-full text-center text-xs font-extrabold text-white py-2 transition hover:text-emerald-200 ${selected ? 'underline decoration-emerald-400 decoration-2' : ''} ${taken ? 'text-rose-300' : ''}`}
                title={taken ? 'Already selected by another player' : 'Tap to select'}
              >
                {index + 1}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
