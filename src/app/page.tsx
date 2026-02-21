'use client';

import React, { useEffect, useState } from 'react';
import { useMultiplayerBingo } from '@/hooks/useMultiplayerBingo';
import { useTelegramAuth, type TelegramAuthLoginResult } from '@/hooks/useTelegramAuth';
import { useGame } from '@/context/GameContext';
import Welcome, { type WelcomeProps } from '@/components/Welcome/Welcome';
import SelectCards from '@/components/Welcome/SelectCards';
import AuthForm from '@/components/AuthForm';
import GameBoard from '@/components/GameBoard';
import ResultOverlay from '@/components/ResultOverlay';

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

export default function Page() {
  const {
    join,
    markCell,
    connected,
    nickname,
    countdown,
    phase,
    cards,
    called,
    lastNumber,
    takenSlots,
    reserveSlots,
    lastWinner,
    error,
    clearError,
    releaseSlots,
  } = useMultiplayerBingo();

  const { state, dispatch } = useGame();
  const { token: authToken, ready: telegramReady, error: telegramAuthError, login } = useTelegramAuth();

  const [nickInput, setNickInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isFirstTime, setIsFirstTime] = useState(true);

  const isNicknameValid = nickInput.trim().length >= 3;

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

  // Sync UI mode with server phase
  useEffect(() => {
    dispatch({ type: 'SET_JOINED', payload: cards.length === 2 });
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
      if (state.mode !== 'game') {
        dispatch({ type: 'VIEW_GAME' });
      }
      return;
    }
    if (phase === 'COUNTDOWN' && !state.hasJoinedRound && state.mode !== 'welcome' && state.mode !== 'result') {
      dispatch({ type: 'PLAY_AGAIN' });
    }
  }, [cards.length, error, phase, state.mode, state.hasJoinedRound, dispatch, lastWinner]);

  // Server is source of truth for round/call state.
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

  const handleAuthSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authToken) {
      setAuthError('Auth is not ready yet. Open from Telegram bot menu button and wait 2-3 seconds.');
      return;
    }

    if (isFirstTime) {
      if (!isNicknameValid) return;
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

    join(nickInput.trim(), authToken);
  };

  if (!nickname) {
    return (
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

  if (state.mode === 'select') {
    return <SelectCards />;
  }

  if (state.mode === 'game') {
    return (
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

  if (state.mode === 'result') {
    return <ResultOverlay />;
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
      onReleaseSlots={releaseSlots}
    />
  );
}
