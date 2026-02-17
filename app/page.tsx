'use client';

import { useEffect, useState } from 'react';
import { useMultiplayerBingo } from '@/hooks/useMultiplayerBingo';
import { useGame } from '@/context/GameContext';
import Welcome from '@/components/Welcome/Welcome';
import SelectCards from '@/components/Welcome/SelectCards';
import PlayerCards from '@/components/Game/PlayerCards';
import CalledNumbersTable from '@/components/Game/CalledNumbersTable';
import ResultPage from '@/components/Result/ResultPage';

export default function Page() {
  const {
    card,
    join,
    connected,
    nickname,
    countdown,
    phase,
    called,
    lastNumber,
    takenSlots,
    reserveSlots,
    releaseSlots,
    lastWinner,
  } = useMultiplayerBingo();

  const { state, dispatch } = useGame();

  const [nickInput, setNickInput] = useState('');

  // Sync UI mode with server phase
  useEffect(() => {
    if (phase === 'ENDED') {
      if (state.mode !== 'result') {
        dispatch({ type: 'SHOW_RESULT' });
      }
      dispatch({ type: 'SET_WINNER_NAME', payload: lastWinner ?? null });
      return;
    }
    if (phase === 'ACTIVE' && state.mode !== 'game') {
      dispatch({ type: 'BEGIN_DRAW' });
      return;
    }
    // Only return to welcome during countdown if we're not on the result screen
    if (phase === 'COUNTDOWN' && state.mode !== 'welcome' && state.mode !== 'result') {
      dispatch({ type: 'PLAY_AGAIN' });
    }
  }, [phase, state.mode, dispatch, lastWinner]);

  if (!nickname) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (nickInput.trim()) join(nickInput.trim());
          }}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 px-6 py-5 shadow-2xl backdrop-blur space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">Join Game</p>
              <h1 className="text-2xl font-black">Enter nickname</h1>
            </div>
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-rose-200 font-semibold">Next Round</p>
              <p className="text-lg font-black text-rose-300 tabular-nums">{countdown}s</p>
            </div>
          </div>
          <input
            value={nickInput}
            onChange={(e) => setNickInput(e.target.value)}
            placeholder="e.g. LuckyPlayer"
            className="w-full rounded-lg bg-slate-900 border border-white/15 px-3 py-2 text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
          />
          <button
            type="submit"
            disabled={!nickInput.trim()}
            className="w-full rounded-lg bg-emerald-500 text-slate-900 font-bold py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connected ? 'Join' : 'Join (connecting...)'}
          </button>
          <p className="text-[11px] text-slate-400">
            You must join to receive your card. Status: {connected ? 'connected' : 'waiting for server...'}
          </p>
        </form>
      </div>
    );
  }

  if (state.mode === 'select') {
    return <SelectCards />;
  }

  if (state.mode === 'game') {
    const calledSet = new Set(called);
    const firstFive = called.slice(0, 5);
    return (
      <main className="h-screen w-screen bg-[#0b1020] text-white overflow-hidden">
        <div className="h-full w-full">
          {/* Top status strip */}
          <div className="flex h-[10vh] w-full items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-slate-800/70 px-2.5 py-1.5 border border-slate-700">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">First 5</span>
              <div className="flex items-center gap-1">
                {firstFive.map((n) => (
                  <span
                    key={n}
                    className="h-8 min-w-8 rounded-full bg-amber-300 text-slate-900 font-bold grid place-items-center shadow-inner shadow-amber-500/40"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-800/70 px-2.5 py-1.5 border border-slate-700">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Last Call</span>
              <span className="h-8 min-w-8 rounded-full bg-amber-400 text-slate-900 font-black grid place-items-center shadow-inner shadow-amber-500/50">
                {lastNumber ?? '—'}
              </span>
              <button
                type="button"
                onClick={() => state.winStatus === 'none' && state.playerCards.length && state.selectedCardIndices.length === 2 ? null : null}
                className="ml-2 rounded-lg bg-emerald-500 px-3 py-1 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/40 active:scale-95"
                disabled
              >
                Force Win
              </button>
            </div>

          </div>

          {/* Main layout: side by side on mobile using horizontal scroll */}
          <section className="flex h-[90vh] w-full gap-0 overflow-hidden">
            <div className="basis-[55%] rounded-2xl border border-slate-800 bg-slate-900/70 p-0 shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden">
              <CalledNumbersTable
                called={calledSet}
                currentCall={lastNumber}
              />
            </div>

            <div className="basis-[45%] rounded-2xl border border-slate-800 bg-slate-900/70 p-0 shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden">
              <div className="flex h-full flex-col gap-2">
                <PlayerCards cards={state.playerCards} />
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (state.mode === 'result') {
    return <ResultPage />;
  }

  return (
    <Welcome
      nickname={nickname}
      countdown={countdown}
      takenSlots={takenSlots}
      onReserveSlots={reserveSlots}
      onReleaseSlots={releaseSlots}
    />
  );
}
