'use client';

import { useMemo, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import MiniCard from './MiniCard';
import WinBlinker from './WinBlinker';

export default function GameBoard() {
  const { state, dispatch } = useGame();
  const cellRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const numbers = useMemo(() => Array.from({ length: 75 }, (_, i) => i + 1), []);
  const calledSet = state.calledNumbers;
  const lastCalled = state.currentCall;
  const firstFive = state.calledNumbersList.slice(0, 5);

  const selectedCards = useMemo(() => {
    const picked = state.selectedCardIndices.slice(0, 2).map((idx) => state.playerCards[idx]).filter(Boolean);
    if (picked.length === 0 && state.playerCards.length) return state.playerCards.slice(0, 2);
    return picked;
  }, [state.playerCards, state.selectedCardIndices]);

  return (
    <main className="game-container no-scroll-viewport">
      {state.winStatus === 'win' && <WinBlinker />}

      <div className="game-body">
        {/* Matrix (left) */}
        <section className="matrix-zone">
          {firstFive.length > 0 && (
            <div className="first-five-strip">
              <span className="first-five-label">First 5</span>
              <div className="first-five-balls">
                {firstFive.map((num) => (
                  <span key={num} className="first-five-ball">
                    {num}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="matrix-header">
            <div className="live-chip">🎱 {lastCalled ?? '…'}</div>
          </div>
          <div className="matrix-grid-75">
            {numbers.map((num) => {
              const called = calledSet.has(num);
              const pulse = lastCalled === num;
              return (
                <div
                  key={num}
                  ref={(el) => {
                    if (el) cellRefs.current.set(num, el);
                  }}
                  className={`tile ${called ? 'tile-called' : 'tile-idle'} ${pulse ? 'tile-pulse' : ''}`}
                >
                  {num}
                </div>
              );
            })}
          </div>
        </section>

        {/* Cards (right) */}
        <section className="cards-zone">
          <div className="cards-header">
            <span className="cards-header__label">Last Call</span>
            <span className="cards-header__pill">{lastCalled ?? '—'}</span>
            <button
              type="button"
              className="force-win-btn"
              onClick={() => dispatch({ type: 'SET_WIN', payload: { winStatus: 'win', winAmount: state.betAmount * 2 } })}
            >
              Force Win
            </button>
          </div>
          {selectedCards.map((card, idx) => (
            <div key={idx} className="card-slot">
              <MiniCard
                card={card}
                currentCall={state.currentCall}
                onCellClick={(row, col) =>
                  dispatch({ type: 'MARK_CELL', payload: { cardIndex: state.playerCards.indexOf(card), row, col } })
                }
                disabled={!state.gameActive || state.winStatus !== 'none'}
              />
            </div>
          ))}
          {selectedCards.length < 2 &&
            Array.from({ length: 2 - selectedCards.length }).map((_, idx) => (
              <div key={`placeholder-${idx}`} className="card-slot placeholder-slot">
                <span className="text-xs text-slate-400">Select card</span>
              </div>
            ))}
        </section>
      </div>

      {/* Floating last ball */}
      {lastCalled !== null && (
        <div className="last-ball">
          <span className="last-ball__inner">{lastCalled}</span>
        </div>
      )}

      <style jsx global>{`
        .game-container {
          position: fixed;
          inset: 0;
          display: flex;
          background: linear-gradient(135deg, #050914, #0b1024 50%, #0f132e);
          color: #e2e8f0;
          overflow: hidden;
          padding: 4px;
        }
        .no-scroll-viewport { overflow: hidden; }
        .game-body {
          display: flex;
          gap: 4px;
          width: 100%;
          height: 100%;
        }
        .matrix-zone {
          flex: 0 0 55%;
          max-width: 55%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          padding: 4px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .first-five-strip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 6px;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .first-five-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #cbd5e1;
        }
        .first-five-balls {
          display: flex;
          gap: 4px;
        }
        .first-five-ball {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 800;
          color: #0f172a;
          background: radial-gradient(circle at 30% 30%, #fff, #fef4d7, #facc15);
          box-shadow: 0 6px 14px rgba(0,0,0,0.25), 0 0 8px rgba(250,204,21,0.35);
        }
        .matrix-header {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .live-chip {
          min-width: 60px;
          padding: 6px 10px;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, #fff7d1, #facc15);
          color: #0f172a;
          font-weight: 800;
          font-size: 12px;
          box-shadow: 0 8px 20px rgba(250, 204, 21, 0.35);
          text-align: center;
        }
        .matrix-grid-75 {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          grid-template-rows: repeat(15, 1fr);
          gap: 2px;
          flex: 1;
        }
        .tile {
          display: grid;
          place-items: center;
          border-radius: 6px;
          font-size: clamp(10px, 1.7vw, 12px);
          font-weight: 800;
          min-height: 0;
          min-width: 0;
          border: 1px solid rgba(255,255,255,0.06);
          line-height: 1;
        }
        .tile-idle {
          color: #94a3b8;
          background: rgba(255,255,255,0.04);
        }
        .tile-called {
          color: #0f172a;
          background: linear-gradient(135deg, #facc15, #f97316);
          box-shadow: 0 0 10px rgba(250, 204, 21, 0.6);
        }
        .tile-pulse { animation: pulse-tile 0.6s ease; }
        @keyframes pulse-tile {
          0% { transform: scale(0.9); box-shadow: 0 0 6px rgba(14,165,233,0.3); }
          50% { transform: scale(1.05); box-shadow: 0 0 14px rgba(250,204,21,0.7); }
          100% { transform: scale(1); }
        }
        .cards-zone {
          flex: 0 0 45%;
          max-width: 45%;
          display: flex;
          display: grid;
          grid-template-rows: auto 1fr 1fr;
          gap: 3px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          padding: 3px;
          min-height: 0;
        }
        .cards-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 6px;
          border-radius: 6px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 4px;
          gap: 6px;
        }
        .cards-header__label {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #cbd5e1;
        }
        .cards-header__pill {
          min-width: 42px;
          text-align: center;
          padding: 4px 8px;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, #fff7d1, #facc15);
          color: #0f172a;
          font-weight: 900;
          box-shadow: 0 8px 18px rgba(250,204,21,0.35);
        }
        .force-win-btn {
          margin-left: 6px;
          padding: 4px 8px;
          font-size: 10px;
          font-weight: 800;
          border-radius: 8px;
          background: linear-gradient(135deg, #10b981, #34d399);
          color: #041012;
          border: 1px solid rgba(16,185,129,0.5);
          box-shadow: 0 6px 12px rgba(16,185,129,0.3);
        }
        .card-slot {
          min-height: 0;
          border-radius: 6px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          overflow: hidden;
          display: flex;
        }
        .card-slot > * { flex: 1; height: 100%; }
        .placeholder-slot { display: grid; place-items: center; }
        /* Force bingo cards to scale to available height */
        .card-slot .bingo-card {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .card-slot .bingo-head { flex-shrink: 0; }
        .card-slot .bingo-grid { flex: 1; }

        .last-ball {
          position: fixed;
          bottom: 10px;
          right: 10px;
          z-index: 50;
        }
        .last-ball__inner {
          display: grid;
          place-items: center;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #fff, #fef4d7, #facc15);
          color: #0f172a;
          font-weight: 900;
          font-size: 16px;
          box-shadow: 0 10px 26px rgba(0,0,0,0.35), 0 0 12px rgba(250,204,21,0.45);
        }

        @media (max-width: 768px) {
          .game-body { flex-direction: row; }
          .matrix-zone { flex: 0 0 55%; max-width: 55%; padding: 3px; }
          .cards-zone { flex: 0 0 45%; max-width: 45%; padding: 3px; gap: 3px; grid-template-rows: auto 1fr 1fr; }
        }
        @media (orientation: landscape) and (max-width: 900px) {
          .game-body { flex-direction: column; }
          .matrix-zone {
            flex: 0 0 40%;
            max-width: 100%;
            height: 38vh;
          }
          .cards-zone {
            flex: 1;
            height: 62vh;
          }
          .dual-card-stack { flex-direction: row; }
          .card-slot { flex: 1; }
        }
      `}</style>
    </main>
  );
}
