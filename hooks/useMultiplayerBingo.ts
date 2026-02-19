'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { BingoCard } from '@/types/game';
import { checkWin } from '@/lib/winCheckerSet';

type Phase = 'COUNTDOWN' | 'ACTIVE' | 'ENDED';

export function useMultiplayerBingo() {
  const socketRef = useRef<Socket | null>(null);
  const pendingJoinRef = useRef<{ nickname: string; token: string } | null>(null);
  const [connected, setConnected] = useState(false);
  const [nickname, setNickname] = useState('');
  const [phase, setPhase] = useState<Phase>('COUNTDOWN');
  const [countdown, setCountdown] = useState<number>(60); // display-friendly countdown
  const [card, setCard] = useState<BingoCard | null>(null);
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

  // derived
  const canClaim = useMemo(() => card && checkWin(marked), [card, marked]);

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

    s.on('joined', ({ card, currentState }) => {
      touchEvent();
      setCard(card);
      setPhase(currentState.phase);
      setCountdown(currentState.countdown ?? 60);
      setCalled(currentState.calledNumbers ?? []);
      setLastNumber(currentState.calledNumbers?.slice(-1)[0] ?? null);
      setWinners(currentState.winners ?? []);
      setMarked(new Set(['2-2']));
      setTakenSlots(currentState.takenSlots ?? []);
    });

    s.on('countdown', ({ timeLeft }) => {
      touchEvent();
      setPhase('COUNTDOWN');
      setCountdown(timeLeft);
      if (timeLeft >= 59) {
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

    s.on('markConfirmed', ({ row, col }) => {
      touchEvent();
      setMarked((prev) => new Set(prev).add(`${row}-${col}`));
    });

    s.on('gameEnd', ({ winnerNickname, winningCard }) => {
      touchEvent();
      setPhase('ENDED');
      setLastWinner(winnerNickname ?? null);
      setWinners((w) => [{ nickname: winnerNickname, at: Date.now() }, ...w].slice(0, 10));
      if (winningCard) setCard(winningCard);
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

  const markCell = (row: number, col: number) => {
    if (!socketRef.current || phase !== 'ACTIVE' || !card) return;
    const cell = card[row]?.[col];
    if (!cell) return;
    const value = cell.value;
    if (value !== 0 && !called.includes(value)) return;
    socketRef.current.emit('markCell', { row, col });
    // optimistic update
    setMarked((prev) => new Set(prev).add(`${row}-${col}`));
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
    setCard(null);
    setCalled([]);
    setLastNumber(null);
    setMarked(new Set(['2-2']));
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
    card,
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

