// Global game state and reducer powering all pages.
'use client';

import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { GameAction, GameResult, GameState } from '@/types/game';
import { generateCards } from '@/lib/cardGenerator';

const BALANCE_STORAGE_KEY = 'bingo_balance';
const RESULTS_STORAGE_KEY = 'bingo_results';

const DEFAULT_BALANCE = 10;
const DEFAULT_BET = 20;

const createInitialState = (initialBalance: number, initialResults: GameResult[]): GameState => ({
  mode: 'welcome',
  hasJoinedRound: false,
  balance: initialBalance,
  betAmount: DEFAULT_BET,
  allCards: [],
  selectedCardIndices: [],
  playerCards: [],
  calledNumbers: new Set<number>(),
  calledNumbersList: [],
  currentCall: null,
  gameActive: false,
  winStatus: 'none',
  winAmount: 0,
  matchedCount: 0,
  results: initialResults,
  insufficientBalanceMessage: '',
  winnerName: null,
});

function toResetPlayerCards(state: GameState) {
  return state.playerCards.map((card) =>
    card.map((row) =>
      row.map((cell) => ({
        ...cell,
        marked: cell.value === 0,
      })),
    ),
  );
}

function countMarkedWithoutFree(cards: GameState['playerCards']) {
  return cards
    .flat()
    .flat()
    .filter((cell) => cell.marked && cell.value !== 0).length;
}

function makeResult(
  type: 'win' | 'loss',
  betAmount: number,
  payout: number,
  matchedCount: number,
): GameResult {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    betAmount,
    payout,
    matchedCount,
    at: new Date().toISOString(),
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'HYDRATE': {
      return {
        ...state,
        balance: action.payload.balance,
        results: action.payload.results.slice(0, 25),
      };
    }
    case 'SET_WINNER_NAME': {
      return { ...state, winnerName: action.payload ?? null };
    }
    case 'SET_CARDS': {
      return {
        ...state,
        allCards: action.payload,
      };
    }
    case 'SET_JOINED': {
      return { ...state, hasJoinedRound: action.payload };
    }
    case 'SYNC_SERVER_ROUND': {
      const calledNumbers = Array.isArray(action.payload.calledNumbers) ? action.payload.calledNumbers : [];
      const nextCalledSet = new Set(calledNumbers);
      return {
        ...state,
        calledNumbers: nextCalledSet,
        calledNumbersList: calledNumbers,
        currentCall: action.payload.currentCall,
        gameActive: action.payload.phase === 'ACTIVE',
      };
    }
    case 'DEPOSIT': {
      if (action.payload <= 0) return state;
      return {
        ...state,
        balance: state.balance + action.payload,
        insufficientBalanceMessage: '',
      };
    }
    case 'WITHDRAW': {
      const amt = action.payload;
      if (amt < 2) {
        return { ...state, insufficientBalanceMessage: 'Minimum withdraw is 2.' };
      }
      if (amt > state.balance) {
        return { ...state, insufficientBalanceMessage: 'Cannot withdraw more than balance.' };
      }
      if (state.balance - amt <= 0) {
        return { ...state, insufficientBalanceMessage: 'Withdraw would leave balance at 0. Keep some balance.' };
      }
      return { ...state, balance: state.balance - amt, insufficientBalanceMessage: '' };
    }
    case 'SET_BET': {
      const bet = Math.max(0, Math.floor(action.payload));
      return { ...state, betAmount: bet, insufficientBalanceMessage: '' };
    }
    case 'SELECT_CARDS': {
      if (action.payload.length > 2) return state;
      const playerCards = action.payload.map((index) => state.allCards[index]);
      return {
        ...state,
        selectedCardIndices: action.payload,
        playerCards,
      };
    }
    case 'START_GAME': {
      if (state.betAmount <= 0) return state;
      if (state.balance < state.betAmount) {
        return {
          ...state,
          insufficientBalanceMessage: 'Insufficient balance. Please deposit before starting.',
        };
      }

      return {
        ...state,
        mode: 'select',
        gameActive: false,
        winStatus: 'none',
        winAmount: 0,
        matchedCount: 0,
        calledNumbers: new Set<number>(),
        calledNumbersList: [],
        currentCall: null,
        playerCards: state.playerCards,
        balance: state.balance - state.betAmount,
        insufficientBalanceMessage: '',
      };
    }
    case 'BEGIN_WAIT':
    case 'BEGIN_DRAW': {
      // Multiplayer is server-authoritative; this action only controls UI mode.
      return {
        ...state,
        mode: 'game',
      };
    }
    case 'START_CALLS': {
      // Multiplayer is server-authoritative; phase sync controls gameActive.
      return state;
    }
    case 'DRAW_NUMBER': {
      // Deprecated for multiplayer mode.
      return state;
    }
    case 'MARK_CELL': {
      // Deprecated for multiplayer mode.
      return state;
    }
    case 'FORCE_WIN': {
      // Deprecated for multiplayer mode.
      return state;
    }
    case 'GAME_LOSS': {
      // Deprecated for multiplayer mode.
      return state;
    }
    case 'SHOW_RESULT': {
      return { ...state, mode: 'result', gameActive: false };
    }
    case 'VIEW_GAME': {
      return { ...state, mode: 'game', gameActive: false };
    }
    case 'PLAY_AGAIN': {
      return {
        ...state,
        mode: 'welcome',
        gameActive: false,
        winStatus: 'none',
        calledNumbers: new Set<number>(),
        calledNumbersList: [],
        currentCall: null,
        winAmount: 0,
        matchedCount: 0,
        selectedCardIndices: [],
        playerCards: [],
        winnerName: null,
        betAmount: DEFAULT_BET,
        hasJoinedRound: false,
      };
    }
    case 'CLEAR_INSUFFICIENT_BALANCE_MESSAGE': {
      return { ...state, insufficientBalanceMessage: '' };
    }
    default:
      return state;
  }
}

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

function readInitialBalance(): number {
  if (typeof window === 'undefined') return DEFAULT_BALANCE;
  const raw = localStorage.getItem(BALANCE_STORAGE_KEY);
  const parsed = raw ? Number(raw) : DEFAULT_BALANCE;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_BALANCE;
}

function readInitialResults(): GameResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RESULTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is GameResult =>
        Boolean(
          entry &&
            typeof entry === 'object' &&
            'id' in entry &&
            'type' in entry &&
            'betAmount' in entry &&
            'payout' in entry &&
            'matchedCount' in entry &&
            'at' in entry,
        ),
    );
  } catch {
    return [];
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const initial = useMemo(() => createInitialState(DEFAULT_BALANCE, []), []);
  const [state, dispatch] = useReducer(gameReducer, initial);
  const [hydrated, setHydrated] = React.useState(false);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(BALANCE_STORAGE_KEY, String(state.balance));
  }, [state.balance, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(state.results));
  }, [state.results, hydrated]);

  useEffect(() => {
    // Hydrate from localStorage on mount to avoid SSR/client mismatch
    const balance = readInitialBalance();
    const results = readInitialResults();
    dispatch({ type: 'HYDRATE', payload: { balance, results } });
    dispatch({ type: 'SET_CARDS', payload: generateCards(30) });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}

