'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { BingoCard, Cell } from '@/types/game';
import { checkWin } from '@/lib/winCheckerSet';

type Phase = 'COUNTDOWN' | 'ACTIVE' | 'ENDED';

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
  const [marked, setMarked] = useState<Set<string>>(new Set(['2-2']));
  const [winners, setWinners] = useState<{ nickname: string; at: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [takenSlots, setTakenSlots] = useState<number[]>([]);
  const [lastWinner, setLastWinner] = useState<string | null>(null);
  const [transport, setTransport] = useState<string>('unknown');
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [eventCount, setEventCount] = useState<number>(0);

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
    const card0Marked = new Set<string>();
    cards[0].forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell.marked) card0Marked.add(`${r}-${c}`);
      });
    });
    return checkWin(card0Marked);
  }, [cards]);

  useEffect(() => {
    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001', {
      transports: ['polling'],
      upgrade: false,
    });
    socketRef.current = s;

    s.on('connect', () => {
      setConnected(true);
      setTransport(s.io.engine.transport.name);
    });
    s.on('disconnect', () => setConnected(false));
    s.on('connect', () => {
      const pending = pendingJoinRef.current;
      if (pending) {
        s.emit('join', pending);
      }
    });

    const touchEvent = () => {
      setLastEventAt(Date.now());
      setEventCount((c) => c + 1);
    };

    s.on('joined', ({ cards: assignedCards, currentState }) => {
      touchEvent();
      setPhase(currentState.phase);
      setCountdown(currentState.countdown ?? 60);
      setCalled(currentState.calledNumbers ?? []);
      setLastNumber(currentState.calledNumbers?.slice(-1)[0] ?? null);
      setWinners(currentState.winners ?? []);
      setCards(normalizeCards(assignedCards ?? []));
      setMarked(new Set(['0-2-2']));
      setTakenSlots(currentState.takenSlots ?? []);
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

    s.on('error', ({ message }) => {
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
    setNickname(nick);
    pendingJoinRef.current = { nickname: nick, token };
    if (socketRef.current.connected) {
      socketRef.current.emit('join', { nickname: nick, token });
    }
  };

  const markCell = (cardIndex: number, row: number, col: number) => {
    if (!socketRef.current || phase !== 'ACTIVE' || !cards.length) return;
    socketRef.current.emit('markCell', { cardIndex, row, col });
  };

  const claimBingo = () => {
    socketRef.current?.emit('claimBingo');
  };

  const reserveSlots = (slots: number[]) => {
    socketRef.current?.emit('reserveCards', { slots });
  };

  const releaseSlots = (slots: number[]) => {
    socketRef.current?.emit('releaseCards', { slots });
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

