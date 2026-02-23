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

import React from 'react';

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

const PlayerCards = React.memo(({ cards, currentCall, canMark, onMarkCell }: PlayerCardsProps) => {
  if (!cards.length) return null;

  return (
    <section className="player-cards player-cards-stack game-phone-cards" aria-label="Your assigned bingo cards">
      {cards.map((card, cardIndex) => (
        <div
          key={`card-${cardIndex}`}
          className="player-card-slot game-phone-card-slot w-full"
          role="region"
          aria-label={`Bingo Card ${cardIndex + 1}`}
        >
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
});

PlayerCards.displayName = 'PlayerCards';

export default PlayerCards;
