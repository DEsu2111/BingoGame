'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { BingoCard } from '@/shared/cardGenerator';
import { checkWin } from '@/shared/winChecker';

type Phase = 'COUNTDOWN' | 'ACTIVE' | 'ENDED';

export function useMultiplayerBingo() {
  const socketRef = useRef<Socket | null>(null);
  const pendingNickRef = useRef<string | null>(null);
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

  // derived
  const canClaim = useMemo(() => card && checkWin(marked), [card, marked]);

  useEffect(() => {
    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001', {
      transports: ['websocket'],
    });
    socketRef.current = s;

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('connect', () => {
      const nick = pendingNickRef.current;
      if (nick) {
        s.emit('join', { nickname: nick });
      }
    });

    s.on('joined', ({ card, currentState }) => {
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
      setPhase('COUNTDOWN');
      setCountdown(timeLeft);
      if (timeLeft >= 59) {
        setTakenSlots([]);
        setLastWinner(null);
      }
    });

    s.on('gameStart', () => {
      setPhase('ACTIVE');
      setCountdown(0);
    });

    s.on('numberCalled', ({ number, calledNumbers }) => {
      setLastNumber(number);
      setCalled(calledNumbers);
    });

    s.on('markConfirmed', ({ row, col }) => {
      setMarked((prev) => new Set(prev).add(`${row}-${col}`));
    });

    s.on('gameEnd', ({ winnerNickname, winningCard }) => {
      setPhase('ENDED');
      setLastWinner(winnerNickname ?? null);
      setWinners((w) => [{ nickname: winnerNickname, at: Date.now() }, ...w].slice(0, 10));
      if (winningCard) setCard(winningCard);
    });

    s.on('cardsTaken', ({ slots }) => {
      setTakenSlots(Array.isArray(slots) ? slots : []);
    });

    s.on('error', ({ message }) => setError(message));

    return () => {
      s.disconnect();
    };
  }, []);


  const join = (nick: string) => {
    if (!socketRef.current) return;
    setNickname(nick);
    pendingNickRef.current = nick;
    if (socketRef.current.connected) {
      socketRef.current.emit('join', { nickname: nick });
    }
  };

  const markCell = (row: number, col: number) => {
    if (!socketRef.current || phase !== 'ACTIVE' || !card) return;
    const value = card[row]?.[col];
    if (value !== 'FREE' && !called.includes(value)) return;
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
  };
}
