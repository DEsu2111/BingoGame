'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import CalledNumbersTable from './CalledNumbersTable';
import PlayerCards from './PlayerCards';
import WinBlinker from './WinBlinker';

export default function GameBoard() {
  const { state, dispatch } = useGame();
  const cellRefs = useRef<Map<number, HTMLTableCellElement>>(new Map());
  const drawRef = useRef<HTMLDivElement | null>(null);

  const tip = useMemo(() => {
    if (state.winStatus === 'win') return 'BINGO! Cash it in and run it back.';
    if (state.calledNumbers.size >= 4) return 'On the brink—watch diagonals and center lines.';
    if (state.calledNumbers.size >= 2) return 'Momentum up—keep marking fast.';
    return 'Focus early—precision beats speed.';
  }, [state.calledNumbers.size, state.winStatus]);

  const currentPosition = useMemo(() => {
    if (state.currentCall === null) return null;
    for (let cardIndex = 0; cardIndex < state.playerCards.length; cardIndex += 1) {
      const card = state.playerCards[cardIndex];
      for (let r = 0; r < card.length; r += 1) {
        for (let c = 0; c < card[r].length; c += 1) {
          if (card[r][c].value === state.currentCall) {
            return { cardIndex, row: r + 1, col: c + 1 };
          }
        }
      }
    }
    return null;
  }, [state.currentCall, state.playerCards]);

  useEffect(() => {
    if (!state.currentCall || typeof window === 'undefined') return;
    const cell = cellRefs.current.get(state.currentCall);
    const drawEl = drawRef.current;
    if (!cell || !drawEl) return;

    const from = cell.getBoundingClientRect();
    const to = drawEl.getBoundingClientRect();
    const clone = cell.cloneNode(true) as HTMLElement;
    clone.style.cssText = `
      position: fixed; left: ${from.left}px; top: ${from.top}px;
      width: ${from.width}px; height: ${from.height}px;
      z-index: 100; transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      background: #22d3ee; border-radius: 50%; color: #0f172a; display: flex;
      align-items: center; justify-content: center; font-weight: 900; box-shadow: 0 0 18px rgba(16,185,129,0.45);
    `;
    document.body.appendChild(clone);
    requestAnimationFrame(() => {
      clone.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(1.6)`;
      clone.style.opacity = '0';
    });
    const cleanup = setTimeout(() => clone.remove(), 380);
    return () => clearTimeout(cleanup);
  }, [state.currentCall]);

  const lastFive = state.calledNumbersList.slice(0, 5);

  return (
    <main className="game-container">
      {state.winStatus === 'win' && <WinBlinker />}

      <div className="absolute inset-0 pointer-events-none opacity-25">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Live Caller */}
      <header className="live-status-bar">
        <div className="flex items-center gap-3">
          <div className="live-ball">
            <div ref={drawRef} className="live-ball__inner">
              {state.currentCall ?? '...'}
            </div>
          </div>
          <div className="history-strip">
            {lastFive.length
              ? lastFive.map((num) => (
                  <span key={num} className="history-ball">
                    {num}
                  </span>
                ))
              : <span className="text-[10px] text-slate-400">Waiting…</span>}
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div className="live-tip">
            <p className="text-[10px] font-black uppercase text-emerald-300 mb-1">{state.winStatus === 'win' ? 'WINNER!' : 'Status'}</p>
            <p className="text-xs font-bold leading-tight text-white line-clamp-2">{tip}</p>
          </div>
          <button
            onClick={() => dispatch({ type: 'PLAY_AGAIN' })}
            className="px-4 py-2 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            Restart
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 w-full px-2 pb-20 md:pb-6">
        <div className="grid gap-2 h-full md:grid-cols-3">
          <section className="bingo-card-wrapper">
            <div className="section-header">Called Numbers</div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-2">
              <CalledNumbersTable called={state.calledNumbers} currentCall={state.currentCall} cellRefs={cellRefs} />
            </div>
          </section>

          <section className="bingo-card-wrapper md:col-span-1">
            <div className="section-header">Your Cards</div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-2">
              <PlayerCards cards={state.playerCards} />
            </div>
          </section>

          <section className="bingo-card-wrapper hidden md:flex">
            <div className="section-header">Chat</div>
            <div className="flex-1 p-3 text-xs text-slate-300">Chat coming soon.</div>
          </section>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="action-dock">
        <div className="dock-icons">
          <button className="dock-icon">🤖<span>Auto</span></button>
          <button className="dock-icon">⚡<span>Turbo</span></button>
          <button className="dock-icon">💬<span>Chat</span></button>
        </div>
        <button
          className={`bingo-cta ${state.winStatus === 'win' ? 'bingo-cta--pulse' : ''}`}
          onClick={() => dispatch({ type: 'PLAY_AGAIN' })}
        >
          BINGO
        </button>
      </div>

      {state.winStatus === 'win' && (
        <div className="bingo-overlay">
          🎊 BINGO! 🎊
        </div>
      )}

      <style jsx global>{`
        .game-container {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          background: radial-gradient(circle at 20% 20%, rgba(59,130,246,0.12), transparent 45%), radial-gradient(circle at 80% 15%, rgba(236,72,153,0.12), transparent 45%), linear-gradient(135deg, #0b1024, #0d0b1f 45%, #120f2c);
          color: #e2e8f0;
          overflow: hidden;
        }
        .live-status-bar {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          backdrop-filter: blur(16px);
          background: rgba(7,9,18,0.65);
        }
        .live-ball {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: radial-gradient(circle at 30% 30%, #ffffff, #d9d9e0, #a1a1b5);
          box-shadow: 0 10px 28px rgba(0,0,0,0.35), 0 0 18px rgba(16,185,129,0.3);
        }
        .live-ball__inner {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 28px;
          font-weight: 900;
          color: #0f172a;
          background: radial-gradient(circle at 30% 30%, #fff, #fef4d7, #facc15);
          border: 4px solid #10b981;
          box-shadow: inset 0 0 8px rgba(0,0,0,0.18);
        }
        .history-strip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .history-ball {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 12px;
          color: #0f172a;
          background: radial-gradient(circle at 30% 30%, #f8fafc, #cbd5e1);
          box-shadow: 0 6px 14px rgba(0,0,0,0.25);
        }
        .live-tip { max-width: 200px; }
        .bingo-card-wrapper {
          display: flex;
          flex-direction: column;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(10px);
          min-height: 0;
          overflow: hidden;
        }
        .section-header {
          padding: 10px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #cbd5e1;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.03);
          text-align: center;
        }
        .action-dock {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 14px;
          background: rgba(7,9,18,0.9);
          border-top: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
        }
        .dock-icons { display: flex; gap: 8px; }
        .dock-icon {
          min-width: 70px;
          height: 46px;
          border-radius: 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: #e2e8f0;
          font-weight: 800;
          font-size: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
        }
        .bingo-cta {
          flex: 1;
          height: 50px;
          border-radius: 16px;
          background: linear-gradient(135deg, #facc15, #f59e0b);
          color: #0f172a;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          box-shadow: 0 12px 28px rgba(250,204,21,0.35);
        }
        .bingo-cta--pulse { animation: pulseGold 1.4s infinite; }
        @keyframes pulseGold {
          0%, 100% { box-shadow: 0 12px 28px rgba(250,204,21,0.35); transform: translateY(0); }
          50% { box-shadow: 0 16px 36px rgba(250,204,21,0.55); transform: translateY(-2px); }
        }
        .bingo-overlay {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          background: rgba(0,0,0,0.45);
          color: #facc15;
          font-size: 32px;
          font-weight: 900;
          text-shadow: 0 0 18px rgba(250,204,21,0.7);
          z-index: 60;
          backdrop-filter: blur(4px);
        }
        .number-cell {
          position: relative;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.25);
        }
        .bingo-daub {
          box-shadow: 0 0 0 3px rgba(16,185,129,0.7), 0 0 18px rgba(236,72,153,0.6);
          animation: pop 180ms ease;
        }
        .bingo-daub--pulse { animation: pop 180ms ease, neonPop 1.2s ease-in-out infinite; }
        @keyframes pop { from { transform: scale(0.9); } to { transform: scale(1); } }
        @keyframes neonPop {
          0%,100% { box-shadow: 0 0 0 2px rgba(59,130,246,0.25); }
          50% { box-shadow: 0 0 0 6px rgba(236,72,153,0.25); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media (max-width: 768px) {
          .live-status-bar { flex-direction: column; align-items: flex-start; }
          .dock-icons { width: 200px; }
          .bingo-cta { flex: 1; }
          .grid { grid-template-columns: 1fr !important; }
          .bingo-card-wrapper.hidden { display: none !important; }
        }
      `}</style>
    </main>
  );
}
