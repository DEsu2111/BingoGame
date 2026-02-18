'use client';

import React, { useEffect, useState } from 'react';
import { useMultiplayerBingo } from '@/hooks/useMultiplayerBingo';
import { useGame } from '@/context/GameContext';
import Welcome, { type WelcomeProps } from '@/components/Welcome/Welcome';
import SelectCards from '@/components/Welcome/SelectCards';
import PlayerCards from '@/components/Game/PlayerCards';
import CalledNumbersTable from '@/components/Game/CalledNumbersTable';
import ResultPage from '@/components/Result/ResultPage';

export default function Page() {
  const {
    join,
    connected,
    nickname,
    countdown,
    phase,
    called,
    lastNumber,
    takenSlots,
    reserveSlots,
    lastWinner,
    error,
    clearError,
  } = useMultiplayerBingo();

  const { state, dispatch } = useGame();

  const [nickInput, setNickInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  const isNicknameValid = nickInput.trim().length >= 3;
  const isPhoneValid = /^09\d{8}$/.test(phoneInput.trim());

  // Sync UI mode with server phase
  useEffect(() => {
    if (error && error.toLowerCase().includes('reserved')) {
      if (state.hasJoinedRound) {
        dispatch({ type: 'SET_JOINED', payload: false });
      }
      if (state.mode !== 'welcome' && state.mode !== 'result') {
        dispatch({ type: 'PLAY_AGAIN' });
      }
    }
    if (phase === 'ENDED') {
      if (state.mode !== 'result') {
        dispatch({ type: 'SHOW_RESULT' });
      }
      dispatch({ type: 'SET_WINNER_NAME', payload: lastWinner ?? null });
      return;
    }
    if (phase === 'ACTIVE') {
      if (state.hasJoinedRound) {
        if (state.mode !== 'game') {
          dispatch({ type: 'BEGIN_DRAW' });
        } else if (!state.gameActive) {
          dispatch({ type: 'START_CALLS' });
        }
      } else if (state.mode !== 'game') {
        dispatch({ type: 'VIEW_GAME' });
      }
      return;
    }
    // Only return to welcome during countdown if we're not on the result screen
    if (phase === 'COUNTDOWN' && !state.hasJoinedRound && state.mode !== 'welcome' && state.mode !== 'result') {
      dispatch({ type: 'PLAY_AGAIN' });
    }
  }, [error, phase, state.mode, state.hasJoinedRound, state.gameActive, dispatch, lastWinner]);

  if (!nickname) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isNicknameValid && isPhoneValid) join(nickInput.trim(), phoneInput.trim());
          }}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 px-6 py-5 shadow-2xl backdrop-blur space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">Online Bingo Game</p>
              <h1 className="text-2xl font-black">Login</h1>
            </div>
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-rose-200 font-semibold">Next Round</p>
              <p className="text-lg font-black text-rose-300 tabular-nums">{countdown}s</p>
            </div>
          </div>
          <input
            value={nickInput}
            onChange={(e) => setNickInput(e.target.value)}
            placeholder="Nickname (min 3 characters)"
            className="w-full rounded-lg bg-slate-900 border border-white/15 px-3 py-2 text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
          />
          <input
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="Phone number (09########)"
            inputMode="numeric"
            maxLength={10}
            className="w-full rounded-lg bg-slate-900 border border-white/15 px-3 py-2 text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
          />
          <button
            type="submit"
            disabled={!isNicknameValid || !isPhoneValid}
            className="w-full rounded-lg bg-emerald-500 text-slate-900 font-bold py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connected ? 'Login' : 'Login (connecting...)'}
          </button>
          <p className="text-[11px] text-slate-400">
            Enter a nickname and phone number to continue. Status: {connected ? 'connected' : 'waiting for server...'}
          </p>
          {!isNicknameValid && nickInput.length > 0 && (
            <p className="text-[11px] text-rose-300">Nickname must be at least 3 characters.</p>
          )}
          {!isPhoneValid && phoneInput.length > 0 && (
            <p className="text-[11px] text-rose-300">Phone must start with 09 and be 10 digits.</p>
          )}
          {error && <p className="text-[11px] text-rose-300">{error}</p>}
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
    const isParticipant = state.selectedCardIndices.length === 2 && state.playerCards.length === 2;
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
            <div className="hidden items-center gap-2 rounded-xl bg-slate-800/70 px-2.5 py-1.5 border border-slate-700">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Countdown</span>
              <span className="h-8 min-w-8 rounded-full bg-rose-400 text-slate-900 font-black grid place-items-center shadow-inner shadow-rose-500/50">
                {countdown}s
              </span>
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
            <div className="ml-auto flex items-center rounded-xl bg-slate-800/70 px-2.5 py-1.5 border border-slate-700">
              <span className="h-8 min-w-8 rounded-full bg-rose-400 text-slate-900 font-black grid place-items-center shadow-inner shadow-rose-500/50">
                {countdown}s
              </span>
            </div>

          </div>

          {/* Main layout: side by side on mobile using horizontal scroll */}
          <section className="flex h-[90vh] w-full gap-0 overflow-hidden">
            <div
              className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-0 shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden ${
                isParticipant ? 'basis-[55%]' : 'basis-[100%]'
              }`}
            >
              <CalledNumbersTable
                called={calledSet}
                currentCall={lastNumber}
              />
            </div>

            {isParticipant ? (
              <div className="basis-[45%] rounded-2xl border border-slate-800 bg-slate-900/70 p-0 shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden">
                <div className="flex h-full flex-col gap-2">
                  <PlayerCards cards={state.playerCards} />
                </div>
              </div>
            ) : (
              <div className="basis-[0%] flex items-center justify-center px-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-center text-sm text-slate-300 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                  Spectator mode — join to see your cards.
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  if (state.mode === 'result') {
    return <ResultPage />;
  }

  const WelcomeView = Welcome as React.ComponentType<WelcomeProps>;

  return (
    <WelcomeView
      nickname={nickname}
      error={error}
      onClearError={clearError}
      phase={phase}
      countdown={countdown}
      takenSlots={takenSlots}
      onReserveSlots={reserveSlots}
    />
  );
}
