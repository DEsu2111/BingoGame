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
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-white to-cyan-50 p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.22),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.18),transparent_42%)]" />
      <div className="relative mx-auto flex max-w-4xl flex-col gap-5 sm:gap-6 animate-fade-in">
        <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-white/70 px-5 py-6 shadow-xl backdrop-blur-md animate-slide-up">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-50/80 via-white/40 to-amber-50/80" />
          <div className="relative flex flex-col gap-3 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 shadow-sm">
              <span className="text-base">🚀</span> Step 1 / 3 · Bank & Bet
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Welcome to Bingo Deluxe ✨
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              Fund your balance, set a bet you’re excited about, then race to pick the two luckiest cards.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs font-semibold text-slate-700">
              <span className="rounded-full bg-emerald-50 px-3 py-1">💸 2× payout on wins</span>
              <span className="rounded-full bg-sky-50 px-3 py-1">⏳ Avg round ~30s</span>
              <span className="rounded-full bg-amber-50 px-3 py-1">🎯 Pick only two cards</span>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-white/85 p-4 shadow-lg backdrop-blur-sm">
            <BalanceDisplay balance={state.balance} />
          </div>
          <div className="rounded-2xl border border-sky-100 bg-white/85 p-4 shadow-lg backdrop-blur-sm">
            <DepositWithdraw
              onDeposit={(amount) => dispatch({ type: 'DEPOSIT', payload: amount })}
              onWithdraw={(amount) => dispatch({ type: 'WITHDRAW', payload: amount })}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-xl backdrop-blur-sm animate-slide-up">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Place your bet</p>
              <h2 className="text-xl font-bold text-slate-900">Lock in a confident wager</h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live balance: ${state.balance.toFixed(2)}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="bet-input">
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
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 shadow-inner outline-none transition focus:border-emerald-400 focus:shadow-soft"
                placeholder="Enter bet"
              />
              <p className="mt-2 text-xs text-slate-600">Win payout is 2× your bet.</p>
            </div>
            <div className="flex flex-col gap-2 text-sm font-semibold text-slate-800 sm:w-48">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 shadow-sm">Next: choose 2 cards 🎴</div>
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 shadow-sm">Balance after bet: ${(state.balance - parsedBet).toFixed(2)}</div>
            </div>
          </div>

          {parsedBet > 0 && state.balance < parsedBet ? (
            <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 shadow-inner">
              Insufficient balance, please deposit.
            </p>
          ) : null}
          {state.insufficientBalanceMessage ? (
            <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 shadow-inner">
              {state.insufficientBalanceMessage}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700">
              Tip: Smaller first bets warm you up; ramp once you’re in flow.
            </p>
            <button
              type="button"
              onClick={handleStart}
              disabled={!canProceed}
              className="group w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            >
              Start Card Selection →
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}


