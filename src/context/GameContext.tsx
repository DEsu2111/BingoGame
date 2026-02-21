/**
 * GameContext.tsx — Global Game State Provider
 *
 * Provides a React context with the full game state and a dispatch function.
 * Uses `useReducer` to manage state transitions via actions.
 *
 * Responsibilities:
 *   - Manages UI mode (welcome → select → game → result → welcome)
 *   - Tracks balance, bets, cards, called numbers, and results
 *   - Persists balance and results to localStorage
 *   - Hydrates from localStorage on mount (avoids SSR mismatch)
 *   - Generates the initial set of available bingo cards
 *
 * Usage:
 *   const { state, dispatch } = useGame();
 */
'use client';

import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { GameAction, GameResult, GameState } from '@/types/game';
import { generateCards } from '@/lib/cardGenerator';

// ─── Constants ──────────────────────────────────────────

const BALANCE_STORAGE_KEY = 'bingo_balance';
const RESULTS_STORAGE_KEY = 'bingo_results';

const DEFAULT_BALANCE = 10;   // Starting balance for new players
const DEFAULT_BET = 20;       // Default bet amount

// ─── Initial State Builder ──────────────────────────────

/**
 * Creates a fresh game state object.
 * Called once on mount; real values are hydrated from localStorage afterward.
 */
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

// ─── Helper Functions ───────────────────────────────────

/** Reset all cell marks on player cards (keep FREE cells marked). */
function toResetPlayerCards(state: GameState) {
  return state.playerCards.map((card) =>
    card.map((row) =>
      row.map((cell) => ({
        ...cell,
        marked: cell.value === 0, // FREE cell stays marked
      })),
    ),
  );
}

/** Count how many non-FREE cells are marked across all player cards. */
function countMarkedWithoutFree(cards: GameState['playerCards']) {
  return cards
    .flat()
    .flat()
    .filter((cell) => cell.marked && cell.value !== 0).length;
}

/** Create a GameResult record for history tracking. */
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

// ─── Reducer ────────────────────────────────────────────

/**
 * The main game reducer. Handles all state transitions.
 *
 * Actions marked as "Deprecated for multiplayer" are no-ops because
 * the server is authoritative for those state changes — they're kept
 * here for type compatibility with older code.
 */
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    // Load saved balance and results from localStorage
    case 'HYDRATE': {
      return {
        ...state,
        balance: action.payload.balance,
        results: action.payload.results.slice(0, 25), // Keep last 25 results
      };
    }

    // Set the winner's name for the result screen
    case 'SET_WINNER_NAME': {
      return { ...state, winnerName: action.payload ?? null };
    }

    // Set the pool of available cards to choose from
    case 'SET_CARDS': {
      return {
        ...state,
        allCards: action.payload,
      };
    }

    // Track whether the player has joined the current round
    case 'SET_JOINED': {
      return { ...state, hasJoinedRound: action.payload };
    }

    // Sync round state from the authoritative server
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

    // Add funds to the player's balance
    case 'DEPOSIT': {
      if (action.payload <= 0) return state;
      return {
        ...state,
        balance: state.balance + action.payload,
        insufficientBalanceMessage: '',
      };
    }

    // Withdraw funds (with validation)
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

    // Update the bet amount
    case 'SET_BET': {
      const bet = Math.max(0, Math.floor(action.payload));
      return { ...state, betAmount: bet, insufficientBalanceMessage: '' };
    }

    // Select which 2 cards the player wants to use
    case 'SELECT_CARDS': {
      if (action.payload.length > 2) return state; // Max 2 cards
      const playerCards = action.payload.map((index) => state.allCards[index]);
      return {
        ...state,
        selectedCardIndices: action.payload,
        playerCards,
      };
    }

    // Start a new game: deduct bet and move to card selection
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

    // Switch to the game view (multiplayer: server controls timing)
    case 'BEGIN_WAIT':
    case 'BEGIN_DRAW': {
      return {
        ...state,
        mode: 'game',
      };
    }

    // Deprecated for multiplayer mode — server controls these
    case 'START_CALLS':
    case 'DRAW_NUMBER':
    case 'MARK_CELL':
    case 'FORCE_WIN':
    case 'GAME_LOSS': {
      return state;
    }

    // Show the result screen
    case 'SHOW_RESULT': {
      return { ...state, mode: 'result', gameActive: false };
    }

    // Switch to the game view
    case 'VIEW_GAME': {
      return { ...state, mode: 'game', gameActive: false };
    }

    // Reset for a new round — return to the welcome screen
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

    // Clear the insufficient balance warning
    case 'CLEAR_INSUFFICIENT_BALANCE_MESSAGE': {
      return { ...state, insufficientBalanceMessage: '' };
    }

    default:
      return state;
  }
}

// ─── Context & Provider ─────────────────────────────────

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

/** Read the saved balance from localStorage (returns default if not found). */
function readInitialBalance(): number {
  if (typeof window === 'undefined') return DEFAULT_BALANCE;
  const raw = localStorage.getItem(BALANCE_STORAGE_KEY);
  const parsed = raw ? Number(raw) : DEFAULT_BALANCE;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_BALANCE;
}

/** Read saved game results from localStorage (returns [] if not found). */
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

/**
 * GameProvider — Wraps the app and provides game state to all children.
 *
 * On mount:
 *   1. Creates initial state with defaults
 *   2. Hydrates balance and results from localStorage
 *   3. Generates 30 random bingo cards
 *   4. Persists balance and results to localStorage on every change
 */
export function GameProvider({ children }: { children: React.ReactNode }) {
  const initial = useMemo(() => createInitialState(DEFAULT_BALANCE, []), []);
  const [state, dispatch] = useReducer(gameReducer, initial);
  const [hydrated, setHydrated] = React.useState(false);

  // Persist balance to localStorage whenever it changes
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(BALANCE_STORAGE_KEY, String(state.balance));
  }, [state.balance, hydrated]);

  // Persist results to localStorage whenever they change
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(state.results));
  }, [state.results, hydrated]);

  // Hydrate from localStorage on mount (avoids SSR/client mismatch)
  useEffect(() => {
    const balance = readInitialBalance();
    const results = readInitialResults();
    dispatch({ type: 'HYDRATE', payload: { balance, results } });
    dispatch({ type: 'SET_CARDS', payload: generateCards(30) });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
}

/**
 * useGame — Hook to access the game state and dispatch function.
 * Must be called inside a <GameProvider>.
 *
 * @throws Error if called outside of GameProvider
 */
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}
