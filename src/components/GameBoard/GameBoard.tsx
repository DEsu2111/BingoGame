/**
 * GameBoard.tsx — Main Game View
 *
 * Renders the in-game layout when a round is active or the player
 * is spectating. Composed of three sub-components:
 *   - Header: top status strip with first-5, current call, countdown
 *   - CalledNumbersTable: full 75-number grid showing which are called
 *   - PlayerCards: the player's two bingo cards (if they joined)
 *
 * Layout:
 *   - Participant (has cards): 55% table / 45% cards
 *   - Spectator (no cards): 70% table / 30% help message
 */
'use client';

import React, { useMemo } from 'react';

import type { BingoCard } from '@/types/game';
import Header from '@/components/Header';
import PlayerCards from '@/components/Game/PlayerCards';
import CalledNumbersTable from '@/components/Game/CalledNumbersTable';

// ─── Props ──────────────────────────────────────────────

type GameBoardProps = {
  called: number[];                                        // All called numbers this round
  countdown: number;                                       // Seconds remaining in countdown
  lastNumber: number | null;                               // Most recently called number
  cards: BingoCard[];                                      // Player's bingo cards (empty if spectating)
  phase: 'COUNTDOWN' | 'ACTIVE' | 'ENDED';                // Current round phase
  onMarkCell: (cardIndex: number, row: number, col: number) => void;  // Callback when player taps a cell
};

// ─── Component ──────────────────────────────────────────

const GameBoard = React.memo(({ called, countdown, lastNumber, cards, phase, onMarkCell }: GameBoardProps) => {
  const calledSet = useMemo(() => new Set(called), [called]);
  const firstFive = useMemo(() => called.slice(0, 5), [called]);
  const isParticipant = cards.length === 2;

  return (
    <main className="h-screen w-screen bg-[#0b1020] text-white overflow-hidden flex flex-col" role="main">
      {/* Fixed Header */}
      <Header firstFive={firstFive} countdown={countdown} lastNumber={lastNumber} />

      {/* Responsive Shell: Vertical Stack on Mobile, Horizontal on Desktop */}
      <section
        className="game-main flex flex-col sm:flex-row h-[90vh] w-full gap-2 p-2 overflow-hidden"
        aria-label="Game board and cards"
      >
        {/* Called Numbers Table */}
        <div
          className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-0 shadow-2xl overflow-hidden flex-1 
            ${isParticipant ? 'sm:basis-[55%]' : 'sm:basis-[70%]'}`}
        >
          <CalledNumbersTable called={calledSet} currentCall={lastNumber} />
        </div>

        {/* Player Cards Panel */}
        {isParticipant ? (
          <div
            className="sm:basis-[45%] rounded-2xl border border-slate-800 bg-slate-900/70 p-0 shadow-2xl overflow-hidden flex-1"
            aria-label="Your bingo cards"
          >
            <div className="player-cards-stack h-full">
              <PlayerCards
                cards={cards}
                currentCall={lastNumber}
                canMark={phase === 'ACTIVE'}
                onMarkCell={onMarkCell}
              />
            </div>
          </div>
        ) : (
          <div
            className="sm:basis-[30%] flex items-center justify-center p-4"
            role="complementary"
          >
            <div className="w-full rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-6 text-center text-sm font-semibold text-amber-100 shadow-xl">
              <span className="block text-2xl mb-2">👀</span>
              Spectating... <br /> Wait for the next round to join.
            </div>
          </div>
        )}
      </section>
    </main>
  );
});

GameBoard.displayName = 'GameBoard';

export default GameBoard;
