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
  const isParticipant = cards.length === 2;

  return (
    <main className="h-dvh w-screen bg-[#050812] text-white overflow-hidden" role="main">
      {phase === 'ACTIVE' ? (
        <div
          className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-center"
          aria-label={`Time until next round: ${countdown} seconds`}
        >
          <p className="text-lg font-black text-rose-300 tabular-nums" aria-hidden="true">{Math.max(0, countdown)}s</p>
        </div>
      ) : null}
      <section
        className="game-main flex h-full w-full gap-1 overflow-hidden p-1"
        aria-label="Game board and cards"
      >
        <div
          className={`min-w-0 rounded-2xl border border-[#1c2b57] bg-[#0b1330] p-0 shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden ${
            isParticipant ? 'basis-[56%] max-w-[56%]' : 'basis-[70%] max-w-[70%]'
          }`}
        >
          <CalledNumbersTable called={calledSet} currentCall={lastNumber} />
        </div>

        {isParticipant ? (
          <div
            className="game-right-panel min-w-0 basis-[44%] max-w-[44%] rounded-2xl border border-[#1c2b57] bg-[#0b1330] p-1 shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden"
            aria-label="Your bingo cards"
          >
            <div className="game-right-topbar" aria-label="Last call and controls">
              <div className="game-right-lastcall">
                <span>LAST</span>
                <span>CALL</span>
              </div>
              <div className="game-right-badge">{lastNumber ?? '-'}</div>
            </div>
            <div className="player-cards-stack h-[calc(100%-4.5rem)]">
              <PlayerCards
                cards={cards}
                currentCall={lastNumber}
                canMark={phase === 'ACTIVE'}
                onMarkCell={onMarkCell}
              />
            </div>
            <div className="game-right-floating-call" aria-hidden="true">{lastNumber ?? '-'}</div>
          </div>
        ) : (
          <div
            className="min-w-0 basis-[30%] flex items-center justify-center p-4"
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
