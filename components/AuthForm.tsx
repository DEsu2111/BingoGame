'use client';

import React from 'react';

type AuthFormProps = {
  countdown: number;
  isFirstTime: boolean;
  nicknameInput: string;
  isNicknameValid: boolean;
  connected: boolean;
  ready: boolean;
  authError: string | null;
  gameError: string | null;
  onNicknameChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export default function AuthForm({
  countdown,
  isFirstTime,
  nicknameInput,
  isNicknameValid,
  connected,
  ready,
  authError,
  gameError,
  onNicknameChange,
  onSubmit,
}: AuthFormProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 px-6 py-5 shadow-2xl backdrop-blur space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">Online Bingo Game</p>
            <h1 className="text-2xl font-black">{isFirstTime ? 'Sign up' : 'Log in'}</h1>
          </div>
          <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-[0.18em] text-rose-200 font-semibold">Next Round</p>
            <p className="text-lg font-black text-rose-300 tabular-nums">{countdown}s</p>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          {!ready
            ? 'Open this page inside Telegram to continue.'
            : isFirstTime
              ? 'First time: verify, then choose a nickname to play.'
              : 'Log in to continue playing with your nickname.'}
        </p>

        <input
          value={nicknameInput}
          onChange={(e) => onNicknameChange(e.target.value)}
          placeholder="Nickname (min 3 characters)"
          className="w-full rounded-lg bg-slate-900 border border-white/15 px-3 py-2 text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
        />

        <button
          type="submit"
          disabled={!ready || (isFirstTime && !isNicknameValid)}
          className="w-full rounded-lg bg-emerald-500 text-slate-900 font-bold py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isFirstTime ? 'Sign up' : connected ? 'Log in' : 'Log in (connecting...)'}
        </button>

        <p className="text-[11px] text-slate-400">
          Status: {connected ? 'connected' : 'waiting for server...'}
        </p>

        {!isNicknameValid && nicknameInput.length > 0 ? (
          <p className="text-[11px] text-rose-300">Nickname must be at least 3 characters.</p>
        ) : null}
        {authError ? <p className="text-[11px] text-rose-300">{authError}</p> : null}
        {gameError ? <p className="text-[11px] text-rose-300">{gameError}</p> : null}
      </form>
    </div>
  );
}
