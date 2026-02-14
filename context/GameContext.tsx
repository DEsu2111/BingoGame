// Global game state and reducer powering all pages.
'use client';

import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { GameAction, GameResult, GameState } from '@/types/game';
import { generateCards } from '@/utils/cardGenerator';
import { checkWin } from '@/utils/winChecker';
import { playWinSound } from '@/utils/sound';

const BALANCE_STORAGE_KEY = 'bingo_balance';
const RESULTS_STORAGE_KEY = 'bingo_results';

const DEFAULT_BALANCE = 1000;
const DRAW_MS = 5000;
const RESULT_DELAY_MS = 6000;

const createInitialState = (initialBalance: number, initialResults: GameResult[]): GameState => ({
  mode: 'welcome',
  balance: initialBalance,
  betAmount: 0,
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
    case 'SET_CARDS': {
      return {
        ...state,
        allCards: action.payload,
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
    case 'BEGIN_DRAW': {
      if (state.selectedCardIndices.length !== 2 || state.playerCards.length !== 2) return state;

      return {
        ...state,
        mode: 'game',
        gameActive: true,
        winStatus: 'none',
        calledNumbers: new Set<number>(),
        calledNumbersList: [],
        currentCall: null,
        matchedCount: 0,
        playerCards: toResetPlayerCards(state),
      };
    }
    case 'DRAW_NUMBER': {
      if (!state.gameActive || state.calledNumbers.size >= 5) return state;

      let number = Math.floor(Math.random() * 75) + 1;
      while (state.calledNumbers.has(number)) {
        number = Math.floor(Math.random() * 75) + 1;
      }

      const nextCalledNumbers = new Set(state.calledNumbers);
      nextCalledNumbers.add(number);
      const nextCalledNumbersList = [...state.calledNumbersList, number];

      return {
        ...state,
        currentCall: number,
        calledNumbers: nextCalledNumbers,
        calledNumbersList: nextCalledNumbersList,
      };
    }
    case 'MARK_CELL': {
      if (!state.gameActive || state.winStatus !== 'none') return state;

      const { cardIndex, row, col } = action.payload;
      const card = state.playerCards[cardIndex];
      if (!card) return state;
      const cell = card[row]?.[col];
      if (!cell) return state;

      if (cell.marked || cell.value === 0) return state;
      if (!state.calledNumbers.has(cell.value)) return state;

      const nextPlayerCards = state.playerCards.map((sourceCard, sourceCardIndex) =>
        sourceCardIndex === cardIndex
          ? sourceCard.map((sourceRow, sourceRowIndex) =>
              sourceRow.map((sourceCell, sourceColIndex) =>
                sourceRowIndex === row && sourceColIndex === col
                  ? { ...sourceCell, marked: true }
                  : sourceCell,
              ),
            )
          : sourceCard,
      );

      const matchedCount = countMarkedWithoutFree(nextPlayerCards);
      const didWin = nextPlayerCards.some((playerCard) => checkWin(playerCard));

      if (didWin) {
        const winAmount = state.betAmount * 2;
        const result = makeResult('win', state.betAmount, winAmount, matchedCount);
        playWinSound();

        return {
          ...state,
          playerCards: nextPlayerCards,
          gameActive: false,
          winStatus: 'win',
          winAmount,
          matchedCount,
          balance: state.balance + winAmount,
          results: [result, ...state.results].slice(0, 25),
        };
      }

      return {
        ...state,
        playerCards: nextPlayerCards,
        matchedCount,
      };
    }
    case 'FORCE_WIN': {
      if (state.winStatus !== 'none') return state;
      const cards = state.playerCards.length ? state.playerCards : toResetPlayerCards(state);
      const firstCard = cards[0];
      if (!firstCard) return state;

      // Mark first row for a guaranteed win
      const forcedCard = cards.map((card, idx) =>
        idx === 0
          ? card.map((row, rIdx) =>
              row.map((cell) => (rIdx === 0 ? { ...cell, marked: true } : cell)),
            )
          : card,
      );

      const matchedCount = countMarkedWithoutFree(forcedCard);
      const winAmount = state.betAmount * 2;
      const result = makeResult('win', state.betAmount, winAmount, matchedCount);

      return {
        ...state,
        playerCards: forcedCard,
        gameActive: false,
        winStatus: 'win',
        winAmount,
        matchedCount,
        balance: state.balance + winAmount,
        results: [result, ...state.results].slice(0, 25),
      };
    }
    case 'GAME_LOSS': {
      if (state.winStatus !== 'none') return state;
      const matchedCount = countMarkedWithoutFree(state.playerCards);
      const result = makeResult('loss', state.betAmount, 0, matchedCount);

      return {
        ...state,
        gameActive: false,
        winStatus: 'loss',
        matchedCount,
        results: [result, ...state.results].slice(0, 25),
      };
    }
    case 'SHOW_RESULT': {
      if (state.winStatus === 'none') return state;
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
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!(state.mode === 'game' && state.gameActive && state.winStatus === 'none')) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      dispatch({ type: 'DRAW_NUMBER' });
    }, DRAW_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [state.mode, state.gameActive, state.winStatus]);

  useEffect(() => {
    if (state.mode !== 'game' || !state.gameActive || state.winStatus !== 'none') return;
    if (state.calledNumbers.size >= 5) {
      dispatch({ type: 'GAME_LOSS' });
    }
  }, [state.mode, state.gameActive, state.winStatus, state.calledNumbers.size]);

  useEffect(() => {
    if (state.winStatus === 'none' || state.mode !== 'game') return;
    const id = setTimeout(() => {
      dispatch({ type: 'SHOW_RESULT' });
    }, RESULT_DELAY_MS);
    return () => clearTimeout(id);
  }, [state.winStatus, state.mode]);

  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}
