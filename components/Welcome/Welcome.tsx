'use client';

import { useMemo, useRef, useState } from 'react';
import { useGame } from '@/context/GameContext';
import CardSelector from './CardSelector';

export type WelcomeProps = {
  nickname?: string;
  error?: string | null;
  onClearError?: () => void;
  phase?: 'COUNTDOWN' | 'ACTIVE' | 'ENDED';
  countdown?: number;
  takenSlots?: number[];
  onReserveSlots?: (slots: number[]) => void;
  debugInfo?: { transport: string; lastEventAt: number | null; eventCount: number };
};

export default function Welcome(props: WelcomeProps) {
  const {
    nickname,
    error,
    onClearError,
    phase = 'COUNTDOWN',
    countdown: sharedCountdown,
    takenSlots = [],
    onReserveSlots,
    debugInfo,
  } = props;
  const { state, dispatch } = useGame();
  const [betInput, setBetInput] = useState<string>(state.betAmount > 0 ? String(state.betAmount) : '');
  const [walletAmount, setWalletAmount] = useState<string>('50');
  const walletInputRef = useRef<HTMLInputElement | null>(null);
  const countdown = sharedCountdown ?? 60;
  const [readyToStart, setReadyToStart] = useState(false);
  const [pendingSelectedIndices, setPendingSelectedIndices] = useState<number[]>(state.selectedCardIndices);

  const parsedBet = useMemo(() => {
    const value = Number(betInput);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.floor(value);
  }, [betInput]);

  // Allow start regardless of bet/cards for manual start; countdown just arms readiness
  const canProceed = pendingSelectedIndices.length === 2;

  /**
   * Move to the game page and start calls.
   * If cards aren't selected, the reducer will auto-pick the first two.
   */
  const handleStart = () => {
    if (!canProceed) return;
    const betPayload = parsedBet > 0 && state.balance >= parsedBet ? parsedBet : 0;
    if (pendingSelectedIndices.length) {
      dispatch({ type: 'SELECT_CARDS', payload: pendingSelectedIndices });
      onReserveSlots?.(pendingSelectedIndices.map((index) => index + 1));
    }
    dispatch({ type: 'SET_JOINED', payload: true });
    dispatch({ type: 'SET_BET', payload: betPayload });
    dispatch({ type: phase === 'ACTIVE' ? 'BEGIN_DRAW' : 'BEGIN_WAIT' });
    setReadyToStart(true);
  };

  const handleWallet = (type: 'DEPOSIT' | 'WITHDRAW') => {
    const value = Number(walletAmount);
    if (!Number.isFinite(value) || value <= 0) return;
    dispatch({ type, payload: value });
    setWalletAmount('50');
  };

  const handleClearSelection = () => {
    setPendingSelectedIndices([]);
    dispatch({ type: 'SELECT_CARDS', payload: [] });
    dispatch({ type: 'SET_JOINED', payload: false });
    onClearError?.();
  };

  const isReservedError = Boolean(error && error.toLowerCase().includes('reserved'));
  const secondsSinceEvent =
    debugInfo?.lastEventAt ? Math.floor((Date.now() - debugInfo.lastEventAt) / 1000) : null;

  return (
    <main className="fixed inset-0 flex flex-col bg-[#050712] text-slate-100 antialiased overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/15 blur-[90px]" />
        <div className="absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-pink-500/15 blur-[120px]" />
      </div>

      <div className="relative z-10 flex h-full w-full max-w-xl flex-col gap-5 px-4 py-5 mx-auto">
        {/* Countdown banner */}
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 shadow-lg">
          <span className="text-[11px] uppercase tracking-[0.2em] font-black text-rose-200">Next Round</span>
          <span className="text-2xl font-black text-rose-400 tabular-nums">{countdown}s</span>
        </div>
        {debugInfo ? (
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 px-3 py-2 text-[11px] text-slate-300">
            <span className="font-semibold">Debug:</span>{' '}
            transport={debugInfo.transport} • events={debugInfo.eventCount}
            {secondsSinceEvent !== null ? ` • last=${secondsSinceEvent}s` : ''}
          </div>
        ) : null}

        {/* Header & Financials */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col bg-white/5 border border-white/10 rounded-xl px-3 py-2 backdrop-blur-md">
            <span className="text-[10px] uppercase tracking-tight text-slate-400 font-bold">Welcome</span>
            <span className="text-sm font-black text-emerald-400 truncate max-w-[150px]">
              {nickname ? nickname : 'Player'}
            </span>
          </div>

          <div className="balance-card">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.15em] text-amber-100/80 font-semibold">
                  Current Balance
                </span>
                <span className="text-lg font-black text-white drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]">
                  ${state.balance.toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                aria-label="Top up"
                onClick={() => walletInputRef.current?.focus()}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-slate-900 font-black shadow-[0_0_14px_rgba(251,191,36,0.5)] hover:scale-105 active:scale-95 transition"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Action buttons row */}
        <div className="action-btn-group">
          <input
            ref={walletInputRef}
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={1}
            value={walletAmount}
            onChange={(e) => setWalletAmount(e.target.value)}
            className="wallet-input"
            placeholder="Amount"
          />
          <button type="button" className="action-btn action-btn--deposit" onClick={() => handleWallet('DEPOSIT')}>
            Deposit
          </button>
          <button type="button" className="action-btn action-btn--withdraw" onClick={() => handleWallet('WITHDRAW')}>
            Withdraw
          </button>
        </div>

        {/* Hero centerpiece */}
        <section className="hero-welcome-container">
          <div className="flex items-center gap-2 text-xl">
            <span className="animate-float">🎱</span>
            <span className="animate-float delay-150">🔢</span>
            <span className="animate-float delay-300">🏆</span>
            <span className="animate-float delay-500">✨</span>
          </div>
          <h1 className="hero-title">Welcome to Bingo Live!</h1>
          <p className="hero-sub">Your Lucky Number is Waiting!</p>
        </section>

        {/* Betting interface */}
        <section className="bg-white/5 border border-white/10 rounded-4xl p-4 space-y-3 backdrop-blur-xl shadow-2xl bet-input-wrapper">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Enter Bet</label>
            <span className="text-[10px] text-emerald-400 font-bold">Payout: 2x</span>
          </div>

          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              value={betInput}
              onChange={(e) => {
                dispatch({ type: 'CLEAR_INSUFFICIENT_BALANCE_MESSAGE' });
                setBetInput(e.target.value);
              }}
              placeholder="0.00"
              className="w-full h-12 rounded-xl bg-slate-950/60 border border-emerald-400/40 px-4 text-lg font-bold text-white outline-none bet-input neon-pulse"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-200 font-bold">$</span>
          </div>

          <div className="flex gap-2">
            {[10, 50].map((val) => (
              <button
                key={val}
                type="button"
                className="quick-chip"
                onClick={() => setBetInput(String((parsedBet || 0) + val))}
              >
                +{val}
              </button>
            ))}
            <button
              type="button"
              className="quick-chip flex-1"
              onClick={() => setBetInput(String(Math.floor(state.balance)))}
            >
              Max
            </button>
          </div>

          {(parsedBet > state.balance || state.insufficientBalanceMessage) && (
            <div className="bg-rose-500/10 border border-rose-500/20 py-2 rounded-xl text-center">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-tight">
                ⚠️ Insufficient Funds
              </span>
            </div>
          )}
        </section>

        {/* Card selection on welcome */}
        <section className="bg-white/5 border border-white/10 rounded-3xl p-3 space-y-3 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-300">Select Cards</p>
            <p className="text-[11px] font-black text-emerald-300">
              {pendingSelectedIndices.length}/2
            </p>
          </div>
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-200 space-y-2">
              <p>{error}</p>
              {isReservedError ? (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="w-full rounded-lg bg-rose-500/20 border border-rose-500/30 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-rose-100"
                >
                  Pick New Cards
                </button>
              ) : null}
            </div>
          )}
          <div className="max-h-36 overflow-y-auto pr-1">
            <CardSelector
              cards={state.allCards}
              selectedIndices={pendingSelectedIndices}
              takenSlots={takenSlots}
              onSelect={(indices) => setPendingSelectedIndices(indices)}
            />
          </div>
        </section>

        {/* CTA */}
        <footer className="pb-2">
          <button
            onClick={handleStart}
            disabled={!canProceed}
            className={`w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-3
              ${canProceed 
                ? 'bg-emerald-500 text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:bg-emerald-400' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
          >
            Join Game <span className="text-xl">→</span>
          </button>
          <p className="text-[9px] text-center text-slate-600 mt-3 font-bold uppercase tracking-widest">
            Fair Play Guaranteed • Secured 256-bit
          </p>
        </footer>
      </div>

      <style jsx global>{`
        .balance-card {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(251, 191, 36, 0.35);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35), 0 0 16px rgba(251, 191, 36, 0.35);
          backdrop-filter: blur(10px);
          border-radius: 18px;
          padding: 10px 14px;
          min-width: 170px;
        }
        .action-btn-group {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          align-items: center;
        }
        .wallet-input {
          height: 42px;
          border-radius: 12px;
          padding: 0 10px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #e2e8f0;
          font-weight: 700;
          outline: none;
        }
        .wallet-input:focus {
          border-color: #34d399;
          box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.2);
        }
        .action-btn {
          height: 42px;
          border-radius: 12px;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.08em;
          transition: transform 150ms ease, box-shadow 150ms ease;
        }
        .action-btn--deposit {
          background: linear-gradient(135deg, #10b981, #34d399);
          color: #041012;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.25);
        }
        .action-btn--withdraw {
          background: linear-gradient(135deg, #334155, #1f2937);
          color: #e2e8f0;
          box-shadow: 0 10px 25px rgba(51, 65, 85, 0.35);
        }
        .action-btn:active {
          transform: translateY(1px) scale(0.99);
        }
        .hero-welcome-container {
          display: grid;
          place-items: center;
          text-align: center;
          gap: 6px;
          padding: 10px 0;
        }
        .hero-title {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: #fff;
          text-shadow: 0 0 12px rgba(59, 130, 246, 0.45), 0 0 18px rgba(236, 72, 153, 0.35);
        }
        .hero-sub {
          font-size: 13px;
          color: #cbd5e1;
        }
        .bet-input-wrapper {
          position: relative;
          overflow: hidden;
        }
        .bet-input-wrapper::before {
          content: '';
          position: absolute;
          inset: -30%;
          background: conic-gradient(from 45deg, rgba(59,130,246,0.25), rgba(236,72,153,0.25), rgba(16,185,129,0.25), rgba(59,130,246,0.25));
          filter: blur(28px);
          opacity: 0.4;
          pointer-events: none;
        }
        .bet-input {
          box-shadow: 0 0 0 1px rgba(52, 211, 153, 0.25);
        }
        .neon-pulse {
          animation: neon 2s ease-in-out infinite;
        }
        @keyframes neon {
          0%, 100% { box-shadow: 0 0 12px rgba(52, 211, 153, 0.25); }
          50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.35); }
        }
        .quick-chip {
          min-width: 70px;
          height: 36px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.06);
          color: #e2e8f0;
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 0.05em;
          transition: transform 120ms ease, box-shadow 150ms ease;
        }
        .quick-chip:hover { box-shadow: 0 8px 18px rgba(59,130,246,0.25); }
        .quick-chip:active { transform: translateY(1px); }
        .animate-float {
          animation: floaty 3s ease-in-out infinite;
        }
        .delay-150 { animation-delay: 0.15s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-500 { animation-delay: 0.5s; }
        @keyframes floaty {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </main>
  );
}
