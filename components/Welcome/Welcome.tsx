'use client';

import { useMemo, useState } from 'react';
import { useGame } from '@/context/GameContext';
import BalanceDisplay from './BalanceDisplay';
import DepositWithdraw from './DepositWithdraw';

export default function Welcome() {
  const { state, dispatch } = useGame();
  const [betInput, setBetInput] = useState<string>(state.betAmount > 0 ? String(state.betAmount) : '');

  const parsedBet = useMemo(() => {
    const value = Number(betInput);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.floor(value);
  }, [betInput]);

  const canProceed = parsedBet > 0 && state.balance >= parsedBet;

  const handleStart = () => {
    dispatch({ type: 'SET_BET', payload: parsedBet });
    dispatch({ type: 'START_GAME' });
  };

  return (
    <main className="fixed inset-0 flex flex-col bg-[#070b14] text-slate-200 antialiased overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-emerald-600/20 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-72 h-72 bg-blue-600/20 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col h-full max-w-md mx-auto w-full p-4 gap-4">
        {/* 1. COMPACT HEADER (Smart Space) */}
        <header className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-md">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-tighter text-slate-400 font-bold">Step 1</span>
            <span className="text-xs font-black text-emerald-400">BANK & BET</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase text-slate-400 block font-bold">Active Wallet</span>
            <span className="text-sm font-black text-white">${state.balance.toFixed(2)}</span>
          </div>
        </header>

        {/* 2. BANKING SECTION (Mobile Responsive Grid) */}
        <section className="rounded-2xl border border-white/10 bg-white/12 p-2.5 shadow-soft backdrop-blur">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-stretch h-28">
            <div className="rounded-xl border border-emerald-200/40 bg-white/10 p-2.5 text-white backdrop-blur flex flex-col justify-center items-center">
              <BalanceDisplay balance={state.balance} />
              <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Current</p>
            </div>
            <div className="rounded-xl border border-sky-200/40 bg-white/10 p-2.5 text-white backdrop-blur flex items-center justify-center">
              <DepositWithdraw
                onDeposit={(amount) => dispatch({ type: 'DEPOSIT', payload: amount })}
                onWithdraw={(amount) => dispatch({ type: 'WITHDRAW', payload: amount })}
              />
            </div>
          </div>
        </section>

        {/* 3. HERO SECTION (Minimalist Engagement) */}
        <section className="flex-1 flex flex-col justify-center items-center text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            <span className="animate-pulse">💎</span>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Bingo Deluxe Live</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white leading-none">
            Welcome to <span className="text-emerald-500">Bingo</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-[240px]">
            The most beautiful bingo experience on mobile. Start winning now! 🚀
          </p>
        </section>

        {/* 4. BET CONSOLE (The "Smart" Input) */}
        <section className="bg-white/5 border border-white/10 rounded-[32px] p-5 space-y-4 backdrop-blur-xl shadow-2xl">
          <div className="flex justify-between items-end">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Your Stake</label>
            <span className="text-[10px] text-emerald-500 font-bold italic">Payout: 2x</span>
          </div>

          <div className="relative group">
            <input
              type="number"
              inputMode="numeric"
              value={betInput}
              onChange={(e) => {
                dispatch({ type: 'CLEAR_INSUFFICIENT_BALANCE_MESSAGE' });
                setBetInput(e.target.value);
              }}
              placeholder="0.00"
              className="w-full bg-slate-950/50 border-2 border-white/10 group-focus-within:border-emerald-500/50 rounded-2xl h-14 px-4 text-xl font-black text-white outline-none transition-all placeholder:text-slate-700"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold">$</span>
          </div>

          {/* Quick Info Labels */}
          <div className="flex gap-2">
            <div className="flex-1 bg-white/5 rounded-xl p-2 border border-white/5">
              <p className="text-[8px] text-slate-500 uppercase font-black">Remaining</p>
              <p className="text-xs font-bold text-slate-200">${(state.balance - parsedBet).toFixed(2)}</p>
            </div>
            <div className="flex-1 bg-white/5 rounded-xl p-2 border border-white/5">
              <p className="text-[8px] text-slate-500 uppercase font-black">Goal</p>
              <p className="text-xs font-bold text-blue-400">Win ${(parsedBet * 2).toFixed(2)}</p>
            </div>
          </div>

          {/* Error Alert (Only shows if needed) */}
          {(parsedBet > state.balance || state.insufficientBalanceMessage) && (
            <div className="bg-rose-500/10 border border-rose-500/20 py-2 rounded-xl text-center">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-tight">
                ⚠️ Insufficient Funds
              </span>
            </div>
          )}
        </section>

        {/* 5. ACTION BUTTON (Sticky Bottom Style) */}
        <footer className="pb-4">
          <button
            onClick={handleStart}
            disabled={!canProceed}
            className={`w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-3
              ${canProceed 
                ? 'bg-emerald-500 text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:bg-emerald-400' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
          >
            {canProceed ? (
              <>Start Selection <span className="text-xl">→</span></>
            ) : (
              'Enter Bet to Play'
            )}
          </button>
          <p className="text-[9px] text-center text-slate-600 mt-3 font-bold uppercase tracking-widest">
            Fair Play Guaranteed • Secured 256-bit
          </p>
        </footer>
      </div>
    </main>
  );
}
