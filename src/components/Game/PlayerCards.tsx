// Renders the two selected cards stacked (top/bottom) during gameplay.
'use client';

import { BingoCard } from '@/types/game';
import MiniCard from './MiniCard';

interface PlayerCardsProps {
  cards: BingoCard[];
  currentCall: number | null;
  canMark: boolean;
  onMarkCell: (cardIndex: number, row: number, col: number) => void;
}

export default function PlayerCards({ cards, currentCall, canMark, onMarkCell }: PlayerCardsProps) {
  if (!cards.length) return null;

  return (
    <section className="player-cards player-cards-stack">
      {cards.map((card, cardIndex) => (
        <div key={`card-${cardIndex}`} className="card-shell card-shell--bare player-card-slot w-full">
          <h4 className="player-card-title">Card {cardIndex + 1}</h4>
          <MiniCard
            card={card}
            currentCall={currentCall}
            disabled={!canMark}
            onCellClick={(row, col) => onMarkCell(cardIndex, row, col)}
          />
        </div>
      ))}
    </section>
  );
}
