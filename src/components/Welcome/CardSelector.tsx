'use client';

import { BingoCard } from '@/types/game';
import {
  playCardDeselectSound,
  playCardSelectSound,
  playUiErrorSound,
  primeSoundEngine,
} from '@/lib/sound';

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
    primeSoundEngine();
    const isTaken = takenSlots.includes(index + 1) && !selectedIndices.includes(index);
    if (isTaken) {
      playUiErrorSound();
      return;
    }

    if (selectedIndices.includes(index)) {
      playCardDeselectSound();
      onRelease?.([index + 1]);
      onSelect(selectedIndices.filter((selectedIndex) => selectedIndex !== index));
      return;
    }

    if (selectedIndices.length < 2) {
      playCardSelectSound(selectedIndices.length + 1);
      onReserve?.([index + 1]);
      onSelect([...selectedIndices, index]);
      return;
    }

    playUiErrorSound();
  };

  return (
    <section className="space-y-2 text-white">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white">
          Selected: {selectedIndices.length}/2
        </p>
        <p className="text-[11px] text-slate-200">
          {selectedIndices.length === 2 ? 'Your cards are locked.' : 'Tap two numbers to select.'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
        {cards.map((card, index) => {
          const selected = selectedIndices.includes(index);
          const taken = takenSlots.includes(index + 1) && !selected;
          const dimmed = selectedIndices.length === 2 && !selected;
          return (
            <article
              key={index}
              className={`select-card select-card--compact select-card--dense border text-white ${
                selected
                  ? 'select-card--selected bg-emerald-500/20 border-emerald-400/60'
                  : taken
                    ? 'select-card--taken bg-rose-500/15 border-rose-400/50 opacity-85 cursor-not-allowed'
                    : 'bg-white/10 border-white/20'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleCard(index)}
                disabled={taken || dimmed}
                className={`w-full text-center text-xs font-extrabold py-2 transition ${
                  selected ? 'text-emerald-100 underline decoration-emerald-300 decoration-2' : 'text-white'
                } ${taken ? 'text-rose-300' : ''} ${dimmed ? 'opacity-40' : ''}`}
                title={taken ? 'Already selected by another player' : 'Tap to select'}
              >
                <span className="inline-flex items-center gap-1">
                  {index + 1}
                  {selected ? (
                    <span className="ml-1 rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-200">
                      Selected
                    </span>
                  ) : taken ? (
                    <span className="ml-1 rounded-full bg-rose-400/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-200">
                      Taken
                    </span>
                  ) : null}
                </span>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
