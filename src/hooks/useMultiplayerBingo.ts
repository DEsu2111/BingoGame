/**
 * useMultiplayerBingo.ts — Socket.io Multiplayer Game Hook
 *
 * Manages the real-time connection to the Bingo game server.
 * This is the single source of truth for all live game state:
 *   - Connection status
 *   - Player identity (nickname)
 *   - Round phase (COUNTDOWN → ACTIVE → ENDED)
 *   - Called numbers and bingo cards
 *   - Card slot reservations
 *
 * The server is AUTHORITATIVE — all game actions (join, mark, claim)
 * are sent as Socket.io events and confirmed by the server before
 * updating local state.
 */
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { BingoCard, Cell } from '@/types/game';
import { checkWin } from '@/lib/winCheckerSet';

// ─── Types ──────────────────────────────────────────────

/** Round phase: waiting for players → playing → round over */
type Phase = 'COUNTDOWN' | 'ACTIVE' | 'ENDED';

/** Standard server acknowledgement for socket commands. */
type CommandAck<T = unknown> = {
  ok: boolean;
  code: string;
  message: string;
  data?: T;
};

// ─── Hook ───────────────────────────────────────────────

export function useMultiplayerBingo() {
  // --- Connection ---
  const socketRef = useRef<Socket | null>(null);
  const pendingJoinRef = useRef<{ nickname: string; token: string } | null>(null);
  const [connected, setConnected] = useState(false);
  const [transport, setTransport] = useState<string>('unknown');

  // --- Player identity ---
  const [nickname, setNickname] = useState('');

  // --- Round state (server-authoritative) ---
  const [phase, setPhase] = useState<Phase>('COUNTDOWN');
  const [countdown, setCountdown] = useState<number>(60);
  const [cards, setCards] = useState<BingoCard[]>([]);
  const [called, setCalled] = useState<number[]>([]);
  const [lastNumber, setLastNumber] = useState<number | null>(null);
  const [marked, setMarked] = useState<Set<string>>(new Set(['0-2-2'])); // Free cell is always marked
  const [winners, setWinners] = useState<{ nickname: string; at: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [takenSlots, setTakenSlots] = useState<number[]>([]);
  const [lastWinner, setLastWinner] = useState<string | null>(null);

  // --- Debug / diagnostics ---
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [eventCount, setEventCount] = useState<number>(0);

  // ─── Utility Helpers ──────────────────────────────────

  /** Generate a unique request ID for correlating server acks. */
  const makeRequestId = (action: string) => `${action}:${Date.now()}:${Math.random().toString(16).slice(2)}`;

  /** Extract user-friendly message from a server ack. */
  const toAckMessage = (ack?: CommandAck) => String(ack?.message ?? 'Request failed.');

  /**
   * Normalize raw card data from the server into our BingoCard type.
   * Handles both object-style cells ({ value, marked, row, col })
   * and plain number arrays, ensuring a consistent 5×5 grid.
   */
  const normalizeCards = (incoming: unknown): BingoCard[] => {
    if (!Array.isArray(incoming)) return [];
    return incoming
      .map((rawCard): BingoCard | null => {
        if (!Array.isArray(rawCard)) return null;
        return rawCard.map((rawRow, r) => {
          if (!Array.isArray(rawRow)) return [];
          return rawRow.map((rawCell, c) => {
            // Object-style cell from server
            if (rawCell && typeof rawCell === 'object' && 'value' in (rawCell as Record<string, unknown>)) {
              const cell = rawCell as Cell;
              return {
                value: Number.isFinite(cell.value) ? Number(cell.value) : 0,
                marked: Boolean(cell.marked),
                row: Number.isInteger(cell.row) ? cell.row : r,
                col: Number.isInteger(cell.col) ? cell.col : c,
              } as Cell;
            }
            // Plain number or 'FREE' string
            const value = rawCell === 'FREE' ? 0 : Number(rawCell);
            return {
              value: Number.isFinite(value) ? value : 0,
              marked: r === 2 && c === 2, // Center cell (FREE) is always marked
              row: r,
              col: c,
            } as Cell;
          });
        });
      })
      .filter((card): card is BingoCard => Array.isArray(card) && card.length === 5);
  };

  // ─── Derived State ────────────────────────────────────

  /**
   * Check if any of the player's cards has a winning pattern.
   * Used to enable/disable the "Claim Bingo" button.
   */
  const canClaim = useMemo(() => {
    if (!cards.length) return false;
    return cards.some((card) => {
      const markedSet = new Set<string>();
      card.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell.marked) markedSet.add(`${r}-${c}`);
        });
      });
      return checkWin(markedSet);
    });
  }, [cards]);

  // ─── Socket Connection & Event Listeners ──────────────

  useEffect(() => {
    // Connect to the game server
    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001', {
      transports: ['websocket', 'polling'], // Prefer WebSocket, fall back to polling
      upgrade: true,
    });
    socketRef.current = s;

    /** Ask the server for the current game state (used on connect/reconnect). */
    const requestSyncState = () => {
      s.emit('syncState');
    };

    // --- Connection lifecycle events ---

    s.on('connect', () => {
      setConnected(true);
      setTransport(s.io.engine.transport.name);
      setError(null);
      requestSyncState();

      // If we had a pending join (e.g., page refreshed mid-game), re-send it
      const pending = pendingJoinRef.current;
      if (pending) {
        s.emit('join', { ...pending, requestId: makeRequestId('join') }, (ack?: CommandAck) => {
          if (!ack?.ok) {
            setError(toAckMessage(ack));
            pendingJoinRef.current = null;
          }
        });
      }
    });

    s.on('disconnect', () => {
      setConnected(false);
      setTransport('disconnected');
    });

    s.on('connect_error', (err) => {
      setConnected(false);
      setError(`Connection error: ${String(err?.message ?? 'socket connect failed')}`);
    });

    s.io.on('reconnect_attempt', () => {
      setTransport('reconnecting');
    });

    s.io.on('reconnect', () => {
      setConnected(true);
      setTransport(s.io.engine.transport.name);
      requestSyncState();
    });

    // --- Helper: timestamp every event for diagnostics ---
    const touchEvent = () => {
      setLastEventAt(Date.now());
      setEventCount((c) => c + 1);
    };

    // --- Game state events from server ---

    /** Full state sync — sent on connect and after reconnect. */
    s.on('stateSync', ({ currentState, player }) => {
      touchEvent();
      const phaseFromServer: Phase = currentState?.phase ?? 'COUNTDOWN';
      const calledNumbers: number[] = Array.isArray(currentState?.calledNumbers) ? currentState.calledNumbers : [];
      setPhase(phaseFromServer);
      setCountdown(phaseFromServer === 'COUNTDOWN' ? Number(currentState?.countdown ?? 60) : 0);
      setCalled(calledNumbers);
      setLastNumber(
        Number.isInteger(currentState?.lastNumber)
          ? currentState.lastNumber
          : calledNumbers.length
            ? calledNumbers[calledNumbers.length - 1]
            : null,
      );
      setWinners(Array.isArray(currentState?.winners) ? currentState.winners : []);
      setTakenSlots(Array.isArray(currentState?.takenSlots) ? currentState.takenSlots : []);
      setCards(normalizeCards(player?.cards ?? []));
      // Reset lastWinner at the start of a new countdown
      if (phaseFromServer === 'COUNTDOWN' && Number(currentState?.countdown ?? 0) >= 59) {
        setLastWinner(null);
      }
    });

    /** Confirmation that the player successfully joined the round. */
    s.on('joined', (payload: { cards?: unknown; currentState?: any; nickname?: string } = {}) => {
      touchEvent();
      const currentState = payload.currentState ?? {};
      const confirmedNickname = String(payload.nickname ?? pendingJoinRef.current?.nickname ?? '').trim();
      setPhase(currentState.phase);
      setCountdown(currentState.countdown ?? 60);
      setCalled(currentState.calledNumbers ?? []);
      setLastNumber(currentState.calledNumbers?.slice(-1)[0] ?? null);
      setWinners(currentState.winners ?? []);
      setCards(normalizeCards(payload.cards ?? []));
      setMarked(new Set(['0-2-2'])); // Reset marks; free cell stays marked
      setTakenSlots(currentState.takenSlots ?? []);
      if (confirmedNickname) {
        setNickname(confirmedNickname);
      }
      pendingJoinRef.current = null;
    });

    /** Server assigned/updated the player's cards. */
    s.on('cardsAssigned', ({ cards: assignedCards }) => {
      touchEvent();
      setCards(normalizeCards(assignedCards ?? []));
      setMarked(new Set(['0-2-2']));
    });

    /** Countdown tick — fires every second during COUNTDOWN phase. */
    s.on('countdown', ({ timeLeft }) => {
      touchEvent();
      setPhase('COUNTDOWN');
      setCountdown(timeLeft);
      // New round: reset all per-round state
      if (timeLeft >= 59) {
        setCalled([]);
        setLastNumber(null);
        setTakenSlots([]);
        setLastWinner(null);
      }
    });

    /** The round has started — numbers will now be called. */
    s.on('gameStart', () => {
      touchEvent();
      setPhase('ACTIVE');
      setCountdown(0);
    });

    /** A new number has been called. */
    s.on('numberCalled', ({ number, calledNumbers }) => {
      touchEvent();
      setLastNumber(number);
      setCalled(calledNumbers);
    });

    /** Server confirmed a cell was marked on the player's card. */
    s.on('markConfirmed', ({ cardIndex, row, col }) => {
      touchEvent();
      const index = Number.isInteger(cardIndex) ? cardIndex : 0;
      setMarked((prev) => new Set(prev).add(`${index}-${row}-${col}`));
      // Optimistically update the card grid
      setCards((prev) =>
        prev.map((card, cIdx) =>
          cIdx === index
            ? card.map((line, rIdx) =>
              line.map((cell, colIdx) =>
                rIdx === row && colIdx === col ? { ...cell, marked: true } : cell,
              ),
            )
            : card,
        ),
      );
    });

    /** The round has ended — someone won (or no one did). */
    s.on('gameEnd', ({ winnerNickname, winningCards }) => {
      touchEvent();
      setPhase('ENDED');
      setLastWinner(winnerNickname ?? null);
      setWinners((w) => [{ nickname: winnerNickname, at: Date.now() }, ...w].slice(0, 10));
      if (winningCards) setCards(normalizeCards(winningCards));
    });

    /** Another player reserved/released card slots. */
    s.on('cardsTaken', ({ slots }) => {
      touchEvent();
      setTakenSlots(Array.isArray(slots) ? slots : []);
    });

    /** Server-side error (e.g., invalid action, rate limit). */
    s.on('gameError', ({ message }) => {
      touchEvent();
      const msg = String(message ?? '');
      setError(msg);
    });

    // Cleanup: disconnect socket when the component unmounts
    return () => {
      s.disconnect();
    };
  }, []);

  // ─── Actions (sent to the server) ─────────────────────

  /**
   * Join the current round with a nickname and auth token.
   * If the socket isn't connected yet, the join is stored
   * in `pendingJoinRef` and will be sent on connect.
   */
  const join = (nick: string, token?: string) => {
    if (!socketRef.current) return;
    if (!token) {
      setError('Authorization token required.');
      return;
    }
    setError(null);
    pendingJoinRef.current = { nickname: nick, token };
    if (socketRef.current.connected) {
      socketRef.current.emit(
        'join',
        { nickname: nick, token, requestId: makeRequestId('join') },
        (ack?: CommandAck) => {
          if (!ack?.ok) {
            setError(toAckMessage(ack));
            pendingJoinRef.current = null;
          }
        },
      );
    }
  };

  /**
   * Mark a cell on one of the player's bingo cards.
   * Only works during the ACTIVE phase.
   */
  const markCell = (cardIndex: number, row: number, col: number) => {
    if (!socketRef.current || phase !== 'ACTIVE' || !cards.length) return;
    socketRef.current.emit(
      'markCell',
      { cardIndex, row, col, requestId: makeRequestId('markCell') },
      (ack?: CommandAck) => {
        const code = ack?.code;
        if (!ack?.ok && (code === 'RATE_LIMIT' || code === 'NOT_JOINED')) {
          setError(toAckMessage(ack));
        }
      },
    );
  };

  /** Claim a Bingo win. Server verifies the winning pattern. */
  const claimBingo = () => {
    socketRef.current?.emit(
      'claimBingo',
      { requestId: makeRequestId('claimBingo') },
      (ack?: CommandAck) => {
        if (!ack?.ok) {
          setError(toAckMessage(ack));
        } else {
          setError(null);
        }
      },
    );
  };

  /** Reserve specific card slots so other players can't take them. */
  const reserveSlots = (slots: number[]) => {
    socketRef.current?.emit(
      'reserveCards',
      { slots, requestId: makeRequestId('reserveCards') },
      (ack?: CommandAck) => {
        if (!ack?.ok) {
          setError(toAckMessage(ack));
        } else {
          setError(null);
        }
      },
    );
  };

  /** Release previously reserved card slots. */
  const releaseSlots = (slots: number[]) => {
    socketRef.current?.emit(
      'releaseCards',
      { slots, requestId: makeRequestId('releaseCards') },
      (ack?: CommandAck) => {
        if (!ack?.ok) {
          setError(toAckMessage(ack));
        }
      },
    );
  };

  /** Clear the current error message. */
  const clearError = () => setError(null);

  /** Log out: reset all local state (does NOT disconnect the socket). */
  const logout = () => {
    pendingJoinRef.current = null;
    setNickname('');
    setCards([]);
    setCalled([]);
    setLastNumber(null);
    setMarked(new Set(['0-2-2']));
    setWinners([]);
    setTakenSlots([]);
    setLastWinner(null);
    setPhase('COUNTDOWN');
    setCountdown(60);
    setError(null);
  };

  // ─── Public API ───────────────────────────────────────

  return {
    connected,
    nickname,
    phase,
    countdown,
    card: cards[0] ?? null,  // Convenience: first card (or null)
    cards,                    // All assigned cards (usually 2)
    called,                   // All called numbers this round
    lastNumber,               // Most recently called number
    marked,
    winners,
    error,
    canClaim,
    takenSlots,
    lastWinner,
    join,
    markCell,
    claimBingo,
    reserveSlots,
    releaseSlots,
    clearError,
    logout,
    transport,
    lastEventAt,
    eventCount,
  };
}

