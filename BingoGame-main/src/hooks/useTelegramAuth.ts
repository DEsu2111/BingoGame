/**
 * useTelegramAuth.ts — Telegram WebApp Authentication Hook
 *
 * Handles the entire Telegram Mini App authentication flow:
 *   1. Detects if the page is running inside Telegram WebApp
 *   2. Retrieves `initData` (signed payload from Telegram)
 *   3. Sends it to our server at POST /api/auth/telegram
 *   4. Server validates the signature and returns a JWT token
 *   5. Polls every 1.2s until initData becomes available
 *
 * Returns: { token, ready, error, login }
 *   - token:  JWT string or null if not yet authenticated
 *   - ready:  true once Telegram WebApp initData is detected
 *   - error:  error message string or null
 *   - login:  async function to trigger/retry authentication
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ──────────────────────────────────────────────

/** User profile data returned by the auth endpoint. */
type TelegramAuthUser = {
  nickname?: string | null;
  username?: string | null;
  firstName?: string | null;
};

/** Successful authentication result. */
export type TelegramAuthLoginResult = {
  token: string;         // JWT for subsequent API calls
  isFirstTime: boolean;  // True if user has never set a nickname
  user?: TelegramAuthUser;
};

/** Shape of the global `window.Telegram` object injected by the Telegram script. */
type TelegramAuthWindow = {
  Telegram?: {
    WebApp?: {
      initData?: string;   // Signed init data string
      ready?: () => void;  // Signals to Telegram that the app is ready
    };
  };
};

// ─── Hook ───────────────────────────────────────────────

export function useTelegramAuth() {
  // --- State ---
  const [token, setToken] = useState<string | null>(null);   // JWT from the server
  const [ready, setReady] = useState(false);                  // Telegram environment detected
  const [error, setError] = useState<string | null>(null);    // Latest error message

  // --- Refs (stable across renders, no re-render on change) ---
  const attemptsWithoutInitDataRef = useRef(0);                // Count polling attempts without initData
  const authResultRef = useRef<TelegramAuthLoginResult | null>(null);  // Cache the login result
  const loginPromiseRef = useRef<Promise<TelegramAuthLoginResult | null> | null>(null); // Prevent parallel requests

  /**
   * login() — Attempt to authenticate with Telegram.
   *
   * - If already authenticated, returns the cached result immediately.
   * - If a request is already in-flight, returns the existing promise (dedup).
   * - Otherwise, reads Telegram initData and calls POST /api/auth/telegram.
   *
   * @returns The auth result, or null if initData isn't available or auth failed.
   */
  const login = useCallback(async (): Promise<TelegramAuthLoginResult | null> => {
    // Return cached result if we already have a token
    if (authResultRef.current && token) {
      return authResultRef.current;
    }

    // Deduplicate: if a login request is already in-flight, wait for it
    if (loginPromiseRef.current) {
      return loginPromiseRef.current;
    }

    const attempt = (async (): Promise<TelegramAuthLoginResult | null> => {
      // SSR guard — window is not available on the server
      if (typeof window === 'undefined') return null;

      // Access the Telegram WebApp object injected by the script in layout.tsx
      const tg = (window as unknown as TelegramAuthWindow).Telegram;
      tg?.WebApp?.ready?.(); // Tell Telegram the app has loaded

      // initData is a signed string; if it's missing, we're not inside Telegram
      const initData = tg?.WebApp?.initData;
      if (!initData) {
        attemptsWithoutInitDataRef.current += 1;
        setReady(false);
        // After 5 failed attempts (~6 seconds), show a user-facing error
        if (attemptsWithoutInitDataRef.current >= 5) {
          setError((prev) => prev ?? 'Telegram data not found. Open from bot menu button, not normal browser.');
        }
        return null;
      }

      // initData found → Telegram environment confirmed
      setReady(true);
      setError(null);

      try {
        // Exchange initData for a JWT token on our server
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        });

        // Parse response (handle empty or malformed bodies gracefully)
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

        // Build the result and cache it
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

    // Store the promise to prevent duplicate requests
    loginPromiseRef.current = attempt;
    try {
      return await attempt;
    } finally {
      loginPromiseRef.current = null;
    }
  }, [token]);

  /**
   * Effect: Auto-poll for Telegram initData on mount.
   *
   * Runs login() immediately, then every 1.2 seconds until a token is obtained.
   * Once token is set, the effect cleans up and stops polling.
   */
  useEffect(() => {
    if (token) return; // Already authenticated — no need to poll

    let cancelled = false;
    const run = async () => {
      if (cancelled || token) return;
      await login();
    };

    void run(); // Try immediately
    const intervalId = window.setInterval(() => {
      void run();
    }, 1200); // Retry every 1.2 seconds

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [token, login]);

  return { token, ready, error, login };
}
