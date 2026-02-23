/**
 * AuthForm.tsx — Login / Signup Form Component
 *
 * Displays the authentication form that users see before joining the game.
 * This is a **pure presentational component** — it receives all data and
 * callbacks via props and does not manage any business logic internally.
 *
 * Features:
 *   - Toggles between "Sign up" (first-time) and "Log in" (returning) modes
 *   - Shows a countdown timer for the next round
 *   - Displays connection status and error messages
 *   - Validates nickname length (min 3 characters)
 */
'use client';

import React from 'react';

// ─── Props ──────────────────────────────────────────────

type AuthFormProps = {
  countdown: number;                                      // Seconds until next round
  isFirstTime: boolean;                                   // True = signup mode, false = login mode
  nicknameInput: string;                                  // Current value of the nickname input
  isNicknameValid: boolean;                               // Whether the nickname meets minimum length
  connected: boolean;                                     // Socket connection status
  ready: boolean;                                         // Whether Telegram environment is detected
  authError: string | null;                               // Auth-related error message
  gameError: string | null;                               // Game-related error message
  onNicknameChange: (value: string) => void;              // Called when user types in the input
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; // Called when form is submitted
};

// ─── Component ──────────────────────────────────────────

const AuthForm = React.memo(({
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
}: AuthFormProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white px-4">
      <form
        onSubmit={onSubmit}
        aria-label={isFirstTime ? 'Sign up form' : 'Log in form'}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 px-6 py-5 shadow-2xl backdrop-blur space-y-4"
      >
        {/* Header row: title + countdown */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">Online Bingo Game</p>
            <h1 className="text-2xl font-black">{isFirstTime ? 'Sign up' : 'Log in'}</h1>
          </div>
          {/* Countdown badge — shows time until the next round */}
          <div
            className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-right"
            aria-live="polite"
            aria-label={`Time until next round: ${countdown} seconds`}
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-rose-200 font-semibold" aria-hidden="true">Next Round</p>
            <p className="text-lg font-black text-rose-300 tabular-nums" aria-hidden="true">{countdown}s</p>
          </div>
        </div>

        {/* Context-sensitive help text */}
        <p className="text-[11px] text-slate-400">
          {!ready
            ? 'Open this page inside Telegram to continue.'
            : isFirstTime
              ? 'First time: verify, then choose a nickname to play.'
              : 'Log in to continue playing with your nickname.'}
        </p>

        {/* Nickname input */}
        <input
          value={nicknameInput}
          onChange={(e) => onNicknameChange(e.target.value)}
          placeholder="Nickname (min 3 characters)"
          aria-label="Enter your nickname"
          required
          minLength={3}
          className="w-full rounded-lg bg-slate-900 border border-white/15 px-3 py-2 text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
        />

        {/* Submit button — disabled until Telegram is ready and nickname is valid */}
        <button
          type="submit"
          disabled={!ready || (isFirstTime && !isNicknameValid)}
          aria-label={isFirstTime ? 'Submit sign up' : 'Submit login'}
          className="w-full rounded-lg bg-emerald-500 text-slate-900 font-bold py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {isFirstTime ? 'Sign up' : connected ? 'Log in' : 'Log in (connecting...)'}
        </button>

        {/* Connection status indicator */}
        <p className="text-[11px] text-slate-400" role="status">
          Status: {connected ? 'connected' : 'waiting for server...'}
        </p>

        {/* Validation / error messages */}
        <div role="alert" className="space-y-1">
          {!isNicknameValid && nicknameInput.length > 0 ? (
            <p className="text-[11px] text-rose-300">Nickname must be at least 3 characters.</p>
          ) : null}
          {authError ? <p className="text-[11px] text-rose-300">{authError}</p> : null}
          {gameError ? <p className="text-[11px] text-rose-300">{gameError}</p> : null}
        </div>
      </form>
    </div>
  );
});

AuthForm.displayName = 'AuthForm';

export default AuthForm;
