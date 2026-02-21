'use client';

import type { BingoCard } from '@/types/game';
import Header from '@/components/Header';
import PlayerCards from '@/components/Game/PlayerCards';
import CalledNumbersTable from '@/components/Game/CalledNumbersTable';

type GameBoardProps = {
  called: number[];
  countdown: number;
  lastNumber: number | null;
  cards: BingoCard[];
  phase: 'COUNTDOWN' | 'ACTIVE' | 'ENDED';
  onMarkCell: (cardIndex: number, row: number, col: number) => void;
};

export default function GameBoard({ called, countdown, lastNumber, cards, phase, onMarkCell }: GameBoardProps) {
  const calledSet = new Set(called);
  const firstFive = called.slice(0, 5);
  const isParticipant = cards.length === 2;

  return (
    <main className="h-screen w-screen bg-[#0b1020] text-white overflow-hidden">
      <div className="h-full w-full">
        <Header firstFive={firstFive} countdown={countdown} lastNumber={lastNumber} />

        <section className="game-main flex h-[90vh] w-full gap-0 overflow-hidden">
          <div
            className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-0 shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden ${
              isParticipant ? 'basis-[55%] max-w-[55%]' : 'basis-[70%] max-w-[70%]'
            }`}
          >
            <CalledNumbersTable called={calledSet} currentCall={lastNumber} />
          </div>

          {isParticipant ? (
            <div className="basis-[45%] max-w-[45%] rounded-2xl border border-slate-800 bg-slate-900/70 p-0 shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden">
              <div className="player-cards-stack">
                <PlayerCards
                  cards={cards}
                  currentCall={lastNumber}
                  canMark={phase === 'ACTIVE'}
                  onMarkCell={onMarkCell}
                />
              </div>
            </div>
          ) : (
            <div className="basis-[30%] max-w-[30%] flex items-center justify-center p-2">
              <div className="w-full rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-center text-xs font-semibold text-amber-100 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                You haven&apos;t selected cards yet.
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
