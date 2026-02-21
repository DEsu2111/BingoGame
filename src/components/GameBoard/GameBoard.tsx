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
  // Derive useful values from the called numbers
  const calledSet = useMemo(() => new Set(called), [called]);
  const firstFive = useMemo(() => called.slice(0, 5), [called]);
  const isParticipant = cards.length === 2;   // Player joined with 2 cards

  return (
    <main className="h-screen w-screen bg-[#0b1020] text-white overflow-hidden" role="main">
      <div className="h-full w-full">

        {/* Top strip: first 5 numbers, current call, countdown */}
        <Header firstFive={firstFive} countdown={countdown} lastNumber={lastNumber} />

        {/* Main content: called numbers table + player cards (or spectator message) */}
        <section className="game-main flex h-[90vh] w-full gap-0 overflow-hidden" aria-label="Game board and cards">

          {/* Called Numbers Table — takes more space for spectators */}
          <div
            className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-0 shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden ${isParticipant ? 'basis-[55%] max-w-[55%]' : 'basis-[70%] max-w-[70%]'
              }`}
            aria-label="Table of all possible bingo numbers"
          >
            <CalledNumbersTable called={calledSet} currentCall={lastNumber} />
          </div>

          {/* Right panel: player's cards OR a "not joined" placeholder */}
          {isParticipant ? (
            <div
              className="basis-[45%] max-w-[45%] rounded-2xl border border-slate-800 bg-slate-900/70 p-0 shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden"
              aria-label="Your bingo cards"
            >
              <div className="player-cards-stack">
                <PlayerCards
                  cards={cards}
                  currentCall={lastNumber}
                  canMark={phase === 'ACTIVE'}  // Only allow marking during active play
                  onMarkCell={onMarkCell}
                />
              </div>
            </div>
          ) : (
            <div
              className="basis-[30%] max-w-[30%] flex items-center justify-center p-2"
              role="complementary"
            >
              <div className="w-full rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-center text-xs font-semibold text-amber-100 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                You haven&apos;t selected cards yet.
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
});

export default GameBoard;
