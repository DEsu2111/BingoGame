// Renders the two selected cards stacked (top/bottom) during gameplay.
'use client';

import { useGame } from '@/context/GameContext';
import { BingoCard } from '@/types/game';
import MiniCard from './MiniCard';

interface PlayerCardsProps {
  cards: BingoCard[];
}

export default function PlayerCards({ cards }: PlayerCardsProps) {
  const { state, dispatch } = useGame();
  if (!cards.length) return null;

  const ordered = state.selectedCardIndices
    .map((idx, position) => ({ idx, card: cards[position] }))
    .filter((entry) => entry.card)
    .sort((a, b) => a.idx - b.idx);

  return (
    <section className="flex h-full flex-col items-center gap-4">
      {ordered.map(({ card, idx }, orderIndex) => (
        <article
          key={idx}
          className={`card-shell ${orderIndex === 0 ? 'card-shell--sky' : 'card-shell--sun'}`}
        >
          <div className="card-shell__header">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Selected Card</p>
              <h3 className="text-sm font-semibold text-slate-100">Card {idx + 1}</h3>
            </div>
            <span className={`chip ${orderIndex === 0 ? 'chip--sky' : 'chip--sun'}`}>
              {orderIndex === 0 ? 'Top Seat' : 'Bottom Seat'}
            </span>
          </div>
          <div className="card-shell__body">
            <MiniCard
              card={card}
              currentCall={state.currentCall}
              disabled={!state.gameActive || state.winStatus !== 'none'}
              onCellClick={(row, col) =>
                dispatch({ type: 'MARK_CELL', payload: { cardIndex: cards.indexOf(card), row, col } })
              }
            />
          </div>
          <div className="card-shell__footer">
            <p className="text-[11px] font-semibold text-slate-200">
              Tap matches • Auto-highlights current row/col • Stay sharp!
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}
