// Step 1 page: balance and bet setup before card selection.
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
    <main className="relative h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-3">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.12),transparent_46%)]" />
      <div className="relative mx-auto flex h-full max-w-4xl flex-col gap-3 animate-fade-in">
        {/* Top bar */}
        <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur">
          <span className="inline-flex items-center gap-2 text-emerald-200">
            <span className="text-sm">🚀</span> Step 1 · Bank & Bet
          </span>
          <span className="text-white/80">Balance ${state.balance.toFixed(2)}</span>
        </header>

        {/* Content grid fits viewport */}
        <div className="grid flex-1 grid-rows-[auto_auto_1fr_auto] gap-3">
          {/* Hero */}
          <div className="rounded-2xl border border-white/10 bg-white/15 px-4 py-3 text-center text-white shadow-sm backdrop-blur">
            <h1 className="text-2xl font-extrabold sm:text-3xl">Welcome to Bingo Deluxe</h1>
            <p className="mt-1 text-xs text-white/80">Deposit, bet, and fly to card selection — all without scrolling.</p>
          </div>

          {/* Balance / Deposit */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-emerald-200/40 bg-white/15 p-3 text-white backdrop-blur">
              <BalanceDisplay balance={state.balance} />
            </div>
            <div className="rounded-xl border border-sky-200/40 bg-white/15 p-3 text-white backdrop-blur">
              <DepositWithdraw
                onDeposit={(amount) => dispatch({ type: 'DEPOSIT', payload: amount })}
                onWithdraw={(amount) => dispatch({ type: 'WITHDRAW', payload: amount })}
              />
            </div>
          </div>

          {/* Bet card */}
          <div className="rounded-2xl border border-white/10 bg-white/12 p-3 shadow-sm backdrop-blur flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center justify-between text-xs font-semibold text-white/80">
              <span>Place your bet</span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Live
              </span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold text-white/80" htmlFor="bet-input">
                  Bet Amount
                </label>
                <input
                  id="bet-input"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={1}
                  value={betInput}
                  onChange={(event) => {
                    dispatch({ type: 'CLEAR_INSUFFICIENT_BALANCE_MESSAGE' });
                    setBetInput(event.target.value);
                  }}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-emerald-400 focus:shadow-soft"
                  placeholder="Enter bet"
                />
                <p className="mt-1 text-[11px] text-white/70">Win payout is 2× your bet.</p>
              </div>
              <div className="flex flex-col gap-1 text-[11px] font-semibold text-white/80 sm:w-40">
                <div className="rounded-lg border border-amber-200/40 bg-amber-50/10 px-2.5 py-1.5">Next: choose 2 cards 🎴</div>
                <div className="rounded-lg border border-sky-200/40 bg-sky-50/10 px-2.5 py-1.5">After bet: ${(state.balance - parsedBet).toFixed(2)}</div>
              </div>
            </div>

            {parsedBet > 0 && state.balance < parsedBet ? (
              <p className="rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-100">
                Insufficient balance, please deposit.
              </p>
            ) : null}
            {state.insufficientBalanceMessage ? (
              <p className="rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-100">
                {state.insufficientBalanceMessage}
              </p>
            ) : null}
          </div>

          {/* Bottom CTA bar */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/15 px-3 py-2 text-xs text-white backdrop-blur">
            <span className="text-[11px] text-white/80">Tip: quick bets keep you in flow.</span>
            <button
              type="button"
              onClick={handleStart}
              disabled={!canProceed}
              className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-white"
            >
              {canProceed ? 'Start Selection →' : 'Set a bet'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}


