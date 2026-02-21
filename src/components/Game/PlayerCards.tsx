/**
 * PlayerCards.tsx — Player's Bingo Cards During Gameplay
 *
 * Renders the player's two selected bingo cards stacked vertically.
 * Each card is rendered via the MiniCard component, which handles
 * individual cell interactions (tapping to mark).
 *
 * Only visible when the player has joined the round (cards.length === 2).
 */
'use client';

import { BingoCard } from '@/types/game';
import MiniCard from './MiniCard';

// ─── Props ──────────────────────────────────────────────

interface PlayerCardsProps {
  cards: BingoCard[];        // Player's assigned cards (usually 2)
  currentCall: number | null; // Most recently called number (highlighted on cards)
  canMark: boolean;           // Whether marking is allowed (only during ACTIVE phase)
  onMarkCell: (cardIndex: number, row: number, col: number) => void;  // Callback when a cell is tapped
}

// ─── Component ──────────────────────────────────────────

export default function PlayerCards({ cards, currentCall, canMark, onMarkCell }: PlayerCardsProps) {
  if (!cards.length) return null;

  return (
    <section className="player-cards player-cards-stack">
      {cards.map((card, cardIndex) => (
        <div key={`card-${cardIndex}`} className="card-shell card-shell--bare player-card-slot w-full">
          {/* Card label (Card 1, Card 2) */}
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
