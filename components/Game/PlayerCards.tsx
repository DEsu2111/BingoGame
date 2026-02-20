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
    <section className="player-cards player-cards-stack">
      {ordered.map(({ card, idx }, position) => (
        <div key={idx} className="card-shell card-shell--bare player-card-slot w-full">
          <h4 className="player-card-title">Card {position + 1}</h4>
          <MiniCard
            card={card}
            currentCall={state.currentCall}
            disabled={!state.gameActive || state.winStatus !== 'none'}
            onCellClick={(row, col) =>
              dispatch({ type: 'MARK_CELL', payload: { cardIndex: cards.indexOf(card), row, col } })
            }
          />
        </div>
      ))}
    </section>
  );
}
