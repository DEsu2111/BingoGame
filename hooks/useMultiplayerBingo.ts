'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { BingoCard, Cell } from '@/types/game';
import { checkWin } from '@/lib/winCheckerSet';

type Phase = 'COUNTDOWN' | 'ACTIVE' | 'ENDED';
type CommandAck<T = unknown> = {
  ok: boolean;
  code: string;
  message: string;
  data?: T;
};

export function useMultiplayerBingo() {
  const socketRef = useRef<Socket | null>(null);
  const pendingJoinRef = useRef<{ nickname: string; token: string } | null>(null);
  const [connected, setConnected] = useState(false);
  const [nickname, setNickname] = useState('');
  const [phase, setPhase] = useState<Phase>('COUNTDOWN');
  const [countdown, setCountdown] = useState<number>(60); // display-friendly countdown
  const [cards, setCards] = useState<BingoCard[]>([]);
  const [called, setCalled] = useState<number[]>([]);
  const [lastNumber, setLastNumber] = useState<number | null>(null);
  const [marked, setMarked] = useState<Set<string>>(new Set(['0-2-2']));
  const [winners, setWinners] = useState<{ nickname: string; at: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [takenSlots, setTakenSlots] = useState<number[]>([]);
  const [lastWinner, setLastWinner] = useState<string | null>(null);
  const [transport, setTransport] = useState<string>('unknown');
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [eventCount, setEventCount] = useState<number>(0);

  const makeRequestId = (action: string) => `${action}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  const toAckMessage = (ack?: CommandAck) => String(ack?.message ?? 'Request failed.');

  const normalizeCards = (incoming: unknown): BingoCard[] => {
    if (!Array.isArray(incoming)) return [];
    return incoming
      .map((rawCard): BingoCard | null => {
        if (!Array.isArray(rawCard)) return null;
        return rawCard.map((rawRow, r) => {
          if (!Array.isArray(rawRow)) return [];
          return rawRow.map((rawCell, c) => {
            if (rawCell && typeof rawCell === 'object' && 'value' in (rawCell as Record<string, unknown>)) {
              const cell = rawCell as Cell;
              return {
                value: Number.isFinite(cell.value) ? Number(cell.value) : 0,
                marked: Boolean(cell.marked),
                row: Number.isInteger(cell.row) ? cell.row : r,
                col: Number.isInteger(cell.col) ? cell.col : c,
              } as Cell;
            }
            const value = rawCell === 'FREE' ? 0 : Number(rawCell);
            return {
              value: Number.isFinite(value) ? value : 0,
              marked: r === 2 && c === 2,
              row: r,
              col: c,
            } as Cell;
          });
        });
      })
      .filter((card): card is BingoCard => Array.isArray(card) && card.length === 5);
  };

  // derived
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

  useEffect(() => {
    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      upgrade: true,
    });
    socketRef.current = s;

    const requestSyncState = () => {
      s.emit('syncState');
    };

    s.on('connect', () => {
      setConnected(true);
      setTransport(s.io.engine.transport.name);
      setError(null);
      requestSyncState();
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

    const touchEvent = () => {
      setLastEventAt(Date.now());
      setEventCount((c) => c + 1);
    };

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
      if (phaseFromServer === 'COUNTDOWN' && Number(currentState?.countdown ?? 0) >= 59) {
        setLastWinner(null);
      }
    });

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
      setMarked(new Set(['0-2-2']));
      setTakenSlots(currentState.takenSlots ?? []);
      if (confirmedNickname) {
        setNickname(confirmedNickname);
      }
      pendingJoinRef.current = null;
    });

    s.on('cardsAssigned', ({ cards: assignedCards }) => {
      touchEvent();
      setCards(normalizeCards(assignedCards ?? []));
      setMarked(new Set(['0-2-2']));
    });

    s.on('countdown', ({ timeLeft }) => {
      touchEvent();
      setPhase('COUNTDOWN');
      setCountdown(timeLeft);
      if (timeLeft >= 59) {
        setCalled([]);
        setLastNumber(null);
        setTakenSlots([]);
        setLastWinner(null);
      }
    });

    s.on('gameStart', () => {
      touchEvent();
      setPhase('ACTIVE');
      setCountdown(0);
    });

    s.on('numberCalled', ({ number, calledNumbers }) => {
      touchEvent();
      setLastNumber(number);
      setCalled(calledNumbers);
    });

    s.on('markConfirmed', ({ cardIndex, row, col }) => {
      touchEvent();
      const index = Number.isInteger(cardIndex) ? cardIndex : 0;
      setMarked((prev) => new Set(prev).add(`${index}-${row}-${col}`));
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

    s.on('gameEnd', ({ winnerNickname, winningCards }) => {
      touchEvent();
      setPhase('ENDED');
      setLastWinner(winnerNickname ?? null);
      setWinners((w) => [{ nickname: winnerNickname, at: Date.now() }, ...w].slice(0, 10));
      if (winningCards) setCards(normalizeCards(winningCards));
    });

    s.on('cardsTaken', ({ slots }) => {
      touchEvent();
      setTakenSlots(Array.isArray(slots) ? slots : []);
    });

    s.on('gameError', ({ message }) => {
      touchEvent();
      const msg = String(message ?? '');
      setError(msg);
    });

    return () => {
      s.disconnect();
    };
  }, []);


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

  const clearError = () => setError(null);
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

  return {
    connected,
    nickname,
    phase,
    countdown,
    card: cards[0] ?? null,
    cards,
    called,
    lastNumber,
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

