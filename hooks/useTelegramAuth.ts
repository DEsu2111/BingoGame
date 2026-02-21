'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type TelegramAuthUser = {
  nickname?: string | null;
  username?: string | null;
  firstName?: string | null;
};

export type TelegramAuthLoginResult = {
  token: string;
  isFirstTime: boolean;
  user?: TelegramAuthUser;
};

type TelegramAuthWindow = {
  Telegram?: {
    WebApp?: {
      initData?: string;
      ready?: () => void;
    };
  };
};

export function useTelegramAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attemptsWithoutInitDataRef = useRef(0);
  const authResultRef = useRef<TelegramAuthLoginResult | null>(null);
  const loginPromiseRef = useRef<Promise<TelegramAuthLoginResult | null> | null>(null);

  const login = useCallback(async (): Promise<TelegramAuthLoginResult | null> => {
    if (authResultRef.current && token) {
      return authResultRef.current;
    }

    if (loginPromiseRef.current) {
      return loginPromiseRef.current;
    }

    const attempt = (async (): Promise<TelegramAuthLoginResult | null> => {
      if (typeof window === 'undefined') return null;

      const tg = (window as unknown as TelegramAuthWindow).Telegram;
      tg?.WebApp?.ready?.();

      const initData = tg?.WebApp?.initData;
      if (!initData) {
        attemptsWithoutInitDataRef.current += 1;
        setReady(false);
        if (attemptsWithoutInitDataRef.current >= 5) {
          setError((prev) => prev ?? 'Telegram data not found. Open from bot menu button, not normal browser.');
        }
        return null;
      }

      setReady(true);
      setError(null);

      try {
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        });

        const raw = await res.text();
        let data: {
          error?: string;
          token?: string;
          isFirstTime?: boolean;
          user?: TelegramAuthUser;
        } = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = {};
        }

        if (!res.ok) {
          throw new Error(data.error || `Auth failed (${res.status})`);
        }
        if (!data.token) {
          throw new Error('Auth token missing');
        }

        const result: TelegramAuthLoginResult = {
          token: data.token,
          isFirstTime: Boolean(data.isFirstTime),
          user: data.user,
        };

        setToken(result.token);
        authResultRef.current = result;
        return result;
      } catch (err) {
        const msg = String((err as Error).message || err);
        setError(msg);
        return null;
      }
    })();

    loginPromiseRef.current = attempt;
    try {
      return await attempt;
    } finally {
      loginPromiseRef.current = null;
    }
  }, [token]);

  useEffect(() => {
    if (token) return;

    let cancelled = false;
    const run = async () => {
      if (cancelled || token) return;
      await login();
    };

    void run();
    const intervalId = window.setInterval(() => {
      void run();
    }, 1200);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [token, login]);

  return { token, ready, error, login };
}
