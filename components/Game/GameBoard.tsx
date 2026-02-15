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

  // Tips that sound like a game narrator
  const tip = useMemo(() => {
    if (state.winStatus === 'win') return 'JACKPOT! Collect your spoils. 🏆';
    if (state.calledNumbers.size >= 4) return 'CRUNCH TIME! One number away... ⚡';
    return 'EYES UP! Watch the ball drop. 🎱';
  }, [state.calledNumbers.size, state.winStatus]);

  // Logic to track where the current number sits in your cards
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const currentPosition = useMemo(() => {
    if (state.currentCall === null) return null;
    for (let cardIndex = 0; cardIndex < state.playerCards.length; cardIndex++) {
      const card = state.playerCards[cardIndex];
      for (let r = 0; r < card.length; r++) {
        for (let c = 0; c < card[r].length; c++) {
          if (card[r][c].value === state.currentCall) {
            return { cardIndex, row: r + 1, col: c + 1 };
          }
        }
      }
    }
    return null;
  }, [state.currentCall, state.playerCards]);

  // Particle/Animation effect for when a new number is drawn
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
      z-index: 100; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      background: #10b981; border-radius: 50%; color: white; display: flex;
      align-items: center; justify-content: center; font-weight: bold;
    `;
    document.body.appendChild(clone);

    requestAnimationFrame(() => {
      clone.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(2)`;
      clone.style.opacity = '0';
    });

    const cleanup = setTimeout(() => clone.remove(), 400);
    return () => clearTimeout(cleanup);
  }, [state.currentCall]);

  return (
    <main className="fixed inset-0 flex flex-col bg-[#05070a] text-slate-100 overflow-hidden select-none">
      {state.winStatus === 'win' && <WinBlinker />}

      {/* BACKGROUND FX */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      {/* 1. TOP HUD (Smarter & More Interactive) */}
      <header className="relative z-20 flex flex-col gap-3 p-4 bg-slate-900/40 border-b border-white/5 backdrop-blur-xl shadow-2xl">
        <div className="flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Balance</span>
              <span className="text-lg font-black text-white">${state.balance.toFixed(2)}</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Payout</span>
              <span className="text-lg font-black text-emerald-400">x{(state.betAmount * 2).toFixed(0)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => dispatch({ type: 'PLAY_AGAIN' })}
              className="px-4 py-2 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              Restart Run
            </button>
          </div>
        </div>

        {/* CURRENT DRAW ORB */}
        <div className="flex items-center justify-center gap-6 py-2">
          <div className="relative group">
            <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
            <div
              ref={drawRef}
              className="relative h-20 w-20 flex items-center justify-center rounded-full bg-linear-to-br from-white to-slate-300 border-4 border-emerald-500 text-3xl font-black text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-bounce-subtle"
            >
              {state.currentCall ?? '...'}
            </div>
          </div>

          <div className="flex flex-col justify-center max-w-37.5">
             <p className="text-[10px] font-black uppercase text-emerald-500 mb-1">{state.winStatus === 'win' ? 'WINNER!' : 'Status'}</p>
             <p className="text-xs font-bold leading-tight text-white line-clamp-2">{tip}</p>
          </div>
        </div>
      </header>

      {/* 2. MAIN BATTLE GRID (Equal Height Split) */}
      <div className="relative z-10 flex flex-1 w-full gap-1 overflow-hidden p-1 bg-black/20">
        
        {/* Left Side: The "Global" Board */}
        <section className="flex-1 min-w-0 h-full rounded-2xl bg-white/2 border border-white/5 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-white/5 bg-white/5">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Called Numbers</h3>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-1">
            <CalledNumbersTable 
              called={state.calledNumbers} 
              currentCall={state.currentCall} 
              cellRefs={cellRefs} 
            />
          </div>
        </section>

        {/* Right Side: Player's Live Cards */}
        <section className="flex-1 min-w-0 h-full rounded-2xl bg-emerald-500/3 border border-emerald-500/10 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-emerald-500/10 bg-emerald-500/5 flex justify-between items-center px-4">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">Your Cards</h3>
            {currentPosition && (
              <span className="text-[8px] font-black text-blue-400 uppercase animate-pulse">
                Match: Card {currentPosition.cardIndex + 1}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-1">
            <PlayerCards cards={state.playerCards} />
          </div>
        </section>
      </div>

      {/* 3. MOBILE BINGO INDICATOR (Floating Toast) */}
      {currentPosition && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-blue-600 px-6 py-2 rounded-full border border-blue-400 shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
           <span className="text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap">
             🎯 Match Found: Row {currentPosition.row}
           </span>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }

        /* Responsive Scaling for Grid Components */
        .game-shell td, .game-shell th {
          padding: 2px !important;
          font-size: 0.75rem !important;
        }
      `}</style>
    </main>
  );
}
