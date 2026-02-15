'use client';

import { useGame } from '@/context/GameContext';
import CardSelector from './CardSelector';

/**
 * SELECT CARDS - BOLD VISIBILITY EDITION
 * Optimized for maximum card clarity and high-impact UI.
 */
export default function SelectCards() {
  const { state, dispatch } = useGame();
  const selectedCount = state.selectedCardIndices.length;
  const canBegin = selectedCount === 2;

  const handleBegin = () => {
    if (!canBegin) return;
    dispatch({ type: 'BEGIN_DRAW' });
  };

  return (
    <main className="fixed inset-0 flex flex-col bg-[#020408] text-white overflow-hidden font-sans">
      
      {/* HIGH-CONTRAST BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#10b98125,transparent_60%)]" />
        <div className="absolute bottom-0 left-0 w-full h-[30%] bg-gradient-to-t from-emerald-900/10 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col h-full max-w-md mx-auto w-full px-4 pt-6 pb-4">
        
        {/* HEADER: Clean & Minimal to save space for cards */}
        <header className="flex justify-between items-end mb-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black uppercase tracking-tighter leading-none text-white">
              MY <span className="text-emerald-500 underline decoration-emerald-500/30 underline-offset-4">DUO</span>
            </h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Selection Phase</p>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="text-2xl font-black tabular-nums leading-none">
              {selectedCount}<span className="text-slate-700">/2</span>
            </div>
            <div className="h-1 w-12 bg-slate-800 mt-1 rounded-full overflow-hidden">
               <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${(selectedCount / 2) * 100}%` }} 
               />
            </div>
          </div>
        </header>

        {/* CARDS CONTAINER: Max visibility focus */}
        <section className="flex-[2] relative rounded-[2rem] border-2 border-white/5 bg-slate-900/20 backdrop-blur-md overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          {/* Subtle grid background to make cards look "anchored" */}
          <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
          
          <div className="absolute inset-0 overflow-y-auto no-scrollbar p-4">
             <CardSelector
                cards={state.allCards}
                selectedIndices={state.selectedCardIndices}
                onSelect={(indices) => dispatch({ type: 'SELECT_CARDS', payload: indices })}
              />
          </div>
          
          {/* Strong shadow gradients to focus eye on center cards */}
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#020408] to-transparent opacity-90 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#020408] to-transparent opacity-90 pointer-events-none" />
        </section>

        {/* INTERACTIVE FOOTER */}
        <footer className="mt-6 space-y-4">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_#3b82f6]" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select your best odds</span>
            </div>
            
            {selectedCount > 0 && (
              <button 
                onClick={() => dispatch({ type: 'SELECT_CARDS', payload: [] })}
                className="text-[10px] font-black text-rose-500 uppercase bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20"
              >
                Reset
              </button>
            )}
          </div>

          {/* MAIN ACTION BUTTON */}
          <button
            type="button"
            onClick={handleBegin}
            disabled={!canBegin}
            className={`group relative w-full h-20 rounded-[1.5rem] font-black uppercase tracking-[0.2em] transition-all duration-500 active:scale-[0.97]
              ${canBegin 
                ? 'bg-emerald-500 text-black shadow-[0_20px_40px_rgba(16,185,129,0.3)]' 
                : 'bg-slate-900 text-slate-600 border border-white/5'
              }`}
          >
            {canBegin ? (
              <div className="flex items-center justify-center gap-3">
                <span className="text-base">Ready to Draw</span>
                <span className="text-2xl">🔥</span>
              </div>
            ) : (
              <span className="text-sm opacity-50">Select 2 Cards</span>
            )}
            
            {/* Shimmer overlay for when ready */}
            {canBegin && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-shimmer" />
            )}
          </button>
          
          <p className="text-center text-[9px] font-bold text-slate-700 uppercase tracking-widest">
            Randomized Deck • Secure Session
          </p>
        </footer>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite linear;
        }
      `}</style>
    </main>
  );
}