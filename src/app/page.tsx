/**
 * page.tsx — Main Page (Thin Orchestrator)
 *
 * This is the single entry point for the entire Bingo game UI.
 * It does NOT contain business logic or heavy markup itself.
 * Instead, it:
 *   1. Connects to the multiplayer server via useMultiplayerBingo()
 *   2. Authenticates the Telegram user via useTelegramAuth()
 *   3. Reads the current UI mode from GameContext
 *   4. Renders the correct screen component based on the current mode
 *
 * Flow:  AuthForm → Welcome → SelectCards → GameBoard → ResultOverlay → (loop)
 */
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useMultiplayerBingo } from '@/hooks/useMultiplayerBingo';
import { useTelegramAuth, type TelegramAuthLoginResult } from '@/hooks/useTelegramAuth';
import { useGame } from '@/context/GameContext';
import Welcome, { type WelcomeProps } from '@/components/Welcome/Welcome';
import SelectCards from '@/components/Welcome/SelectCards';
import AuthForm from '@/components/AuthForm';
import GameBoard from '@/components/GameBoard';
import ResultOverlay from '@/components/ResultOverlay';
import {
  announceCalledNumber,
  playLoginSuccessSound,
  playLoseSound,
  playRoundStartSound,
  playWinSound,
  primeSoundEngine,
  startLoginBackgroundMusic,
  stopCalledNumberAnnouncements,
  stopLoginBackgroundMusic,
} from '@/lib/sound';

type UiTheme = 'dark' | 'light';

// ─── Helpers ──────────────────────────────────────────────

/**
 * Picks the best display name from the auth result.
 * Priority: saved nickname → Telegram username → first name.
 */
function applyAuthProfile(result: TelegramAuthLoginResult, setNickInput: (value: string) => void) {
  if (result.user?.nickname) {
    setNickInput(result.user.nickname);
    return;
  }
  if (result.user?.username) {
    setNickInput(result.user.username);
    return;
  }
  if (result.user?.firstName) {
    setNickInput(result.user.firstName);
  }
}

// ─── Page Component ───────────────────────────────────────

export default function Page() {
  // --- Server connection (Socket.io) ---
  const {
    join,          // Join a game round with a nickname + auth token
    markCell,      // Mark a cell on a bingo card
    connected,     // Whether the socket is connected
    nickname,      // Confirmed nickname from the server (empty = not joined)
    countdown,     // Seconds until the next round starts
    phase,         // Current round phase: 'COUNTDOWN' | 'ACTIVE' | 'ENDED'
    cards,         // Player's bingo cards (array of 5×5 grids)
    called,        // List of numbers that have been called so far
    lastNumber,    // The most recently called number
    takenSlots,    // Card slots already reserved by other players
    reserveSlots,  // Reserve card slots on the server
    lastWinner,    // Nickname of the last round's winner
    error,         // Server-side error message (if any)
    clearError,    // Clear the error message
    releaseSlots,  // Release previously reserved card slots
    logout,        // Clear client game/session state
  } = useMultiplayerBingo();

  // --- UI state from context ---
  const { state, dispatch } = useGame();

  // --- Telegram authentication ---
  const { token: authToken, ready: telegramReady, error: telegramAuthError, login } = useTelegramAuth();

  // --- Local form state ---
  const [nickInput, setNickInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isFirstTime, setIsFirstTime] = useState(true); // True = user needs to set a nickname (signup)
  const prevNicknameRef = useRef('');
  const prevPhaseRef = useRef(phase);
  const prevLastNumberRef = useRef<number | null>(null);
  const [uiTheme, setUiTheme] = useState<UiTheme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = window.localStorage.getItem('ui_theme');
    return stored === 'light' || stored === 'dark' ? stored : 'dark';
  });

  /** Nickname must be at least 3 characters to be valid. */
  const isNicknameValid = nickInput.trim().length >= 3;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', uiTheme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ui_theme', uiTheme);
    }
  }, [uiTheme]);

  // ─── Effects ──────────────────────────────────────────

  /**
   * Effect: Sync auth state from Telegram on mount.
   * Calls login() which attempts to get a JWT from Telegram initData.
   * If successful, pre-fills the nickname input.
   */
  useEffect(() => {
    let cancelled = false;

    const syncAuthState = async () => {
      if (cancelled) return;
      const result = await login();
      if (!result || cancelled) return;

      setAuthError(null);
      setIsFirstTime(Boolean(result.isFirstTime));
      applyAuthProfile(result, setNickInput);
    };

    void syncAuthState();

    return () => {
      cancelled = true;
    };
  }, [authToken, login]);

  /**
   * Effect: Keep the UI mode in sync with the server's game phase.
   *
   * Key transitions:
   * - ENDED → show the result screen
   * - ACTIVE → show the game board
   * - COUNTDOWN + not joined → return to the welcome screen
   * - "reserved" error → kick back to welcome (cards were taken)
   */
  useEffect(() => {
    // Track whether the player has cards assigned (2 cards = joined)
    dispatch({ type: 'SET_JOINED', payload: cards.length === 2 });

    // If cards were reserved by someone else, reset to welcome
    if (error && error.toLowerCase().includes('reserved')) {
      if (state.hasJoinedRound) {
        dispatch({ type: 'SET_JOINED', payload: false });
      }
      if (state.mode !== 'welcome' && state.mode !== 'result') {
        dispatch({ type: 'PLAY_AGAIN' });
      }
    }

    // Phase → UI mode mapping
    if (phase === 'ENDED') {
      if (state.mode !== 'result') {
        dispatch({ type: 'SHOW_RESULT' });
      }
      dispatch({ type: 'SET_WINNER_NAME', payload: lastWinner ?? null });
      return;
    }
    if (phase === 'ACTIVE') {
      if (state.mode !== 'game') {
        dispatch({ type: 'VIEW_GAME' });
      }
      return;
    }
    // During countdown, return non-joined players to welcome
    // (but don't interrupt the result screen)
    if (phase === 'COUNTDOWN' && !state.hasJoinedRound && state.mode !== 'welcome' && state.mode !== 'result') {
      dispatch({ type: 'PLAY_AGAIN' });
    }
  }, [cards.length, error, phase, state.mode, state.hasJoinedRound, dispatch, lastWinner]);

  /**
   * Effect: Forward the server's round data into GameContext.
   * This keeps the context's calledNumbers, currentCall, and phase in sync
   * with the authoritative server state.
   */
  useEffect(() => {
    dispatch({
      type: 'SYNC_SERVER_ROUND',
      payload: {
        phase,
        calledNumbers: called,
        currentCall: lastNumber,
      },
    });
  }, [dispatch, phase, called, lastNumber]);

  // Sound: play a success sound once when user becomes logged in/joined.
  useEffect(() => {
    if (!nickname) {
      prevNicknameRef.current = '';
      stopCalledNumberAnnouncements();
      stopLoginBackgroundMusic();
      return;
    }
    if (!prevNicknameRef.current) {
      playLoginSuccessSound();
    }
    startLoginBackgroundMusic();
    prevNicknameRef.current = nickname;
  }, [nickname]);

  useEffect(() => () => {
    stopCalledNumberAnnouncements();
    stopLoginBackgroundMusic();
  }, []);

  // Sound: phase transitions for round start/end.
  useEffect(() => {
    const previous = prevPhaseRef.current;
    if (phase === previous) return;

    if (phase === 'ACTIVE') {
      playRoundStartSound();
    }
    if (phase === 'ENDED') {
      const isSelfWinner = Boolean(lastWinner && nickname && lastWinner === nickname);
      if (isSelfWinner) {
        playWinSound();
      } else {
        playLoseSound();
      }
    }
    prevPhaseRef.current = phase;
  }, [phase, lastWinner, nickname]);

  // Sound: short cue on every new called number during active round.
  useEffect(() => {
    if (phase !== 'ACTIVE' || lastNumber === null) {
      prevLastNumberRef.current = lastNumber;
      return;
    }
    if (lastNumber !== prevLastNumberRef.current) {
      announceCalledNumber(lastNumber, called.length <= 5);
    }
    prevLastNumberRef.current = lastNumber;
  }, [phase, lastNumber, called.length]);

  // ─── Event Handlers ─────────────────────────────────────

  /**
   * Handles the login / signup form submission.
   * - First-time users: saves their nickname via the API, then joins
   * - Returning users: joins directly with their existing nickname
   */
  const handleAuthSubmit = React.useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    primeSoundEngine();
    if (!authToken) {
      setAuthError('Auth is not ready yet. Open from Telegram bot menu button and wait 2-3 seconds.');
      return;
    }

    if (isFirstTime) {
      if (!isNicknameValid) return;
      // Save the new nickname on the server, then join the game
      fetch('/api/auth/nickname', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ nickname: nickInput.trim() }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || 'Nickname update failed');
          setIsFirstTime(false);
          join(nickInput.trim(), authToken);
        })
        .catch((err) => setAuthError(String(err.message || err)));
      return;
    }

    // Returning user — join directly
    join(nickInput.trim(), authToken);
  }, [authToken, isFirstTime, isNicknameValid, nickInput, join]);

  const renderWithThemeToggle = (content: React.ReactNode) => (
    <>
      {content}
      <button
        type="button"
        className="theme-toggle-btn"
        onClick={() => setUiTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        aria-label={`Switch to ${uiTheme === 'light' ? 'dark' : 'light'} mode`}
      >
        {uiTheme === 'light' ? 'Dark' : 'Light'}
      </button>
    </>
  );

  // ─── Render (mode-based routing) ──────────────────────

  // Not authenticated yet → show login/signup form
  if (!nickname) {
    return renderWithThemeToggle(
      <AuthForm
        countdown={countdown}
        isFirstTime={isFirstTime}
        nicknameInput={nickInput}
        isNicknameValid={isNicknameValid}
        connected={connected}
        ready={telegramReady}
        authError={authError ?? telegramAuthError}
        gameError={error}
        onNicknameChange={setNickInput}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  // Card selection phase
  if (state.mode === 'select') {
    return renderWithThemeToggle(<SelectCards />);
  }

  // Active game phase → show the board
  if (state.mode === 'game') {
    return renderWithThemeToggle(
      <GameBoard
        called={called}
        countdown={countdown}
        lastNumber={lastNumber}
        cards={cards}
        phase={phase}
        onMarkCell={markCell}
      />
    );
  }

  // Round ended → show the result
  if (state.mode === 'result') {
    return renderWithThemeToggle(<ResultOverlay nickname={nickname} lastWinner={lastWinner} onLogout={logout} />);
  }

  // Default: welcome/lobby screen
  const WelcomeView = Welcome as React.ComponentType<WelcomeProps>;

  return renderWithThemeToggle(
    <WelcomeView
      nickname={nickname}
      error={error}
      onClearError={clearError}
      phase={phase}
      countdown={countdown}
      takenSlots={takenSlots}
      onReserveSlots={reserveSlots}
      onReleaseSlots={releaseSlots}
    />
  );
}
