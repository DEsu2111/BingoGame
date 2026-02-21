/**
 * game.ts — Shared Game Type Definitions
 *
 * Central type definitions used across the entire app:
 *   - Cell: a single cell in a bingo card
 *   - BingoCard: a 5×5 grid of cells
 *   - GameState: the full UI state managed by GameContext
 *   - GameAction: all possible actions the reducer can handle
 *   - GameResult: a historical round outcome (win/loss)
 */

// ─── Cell & Card ────────────────────────────────────────

/** A single cell in a 5×5 bingo card. */
export interface Cell {
  value: number;    // The number displayed (0 = FREE cell)
  marked: boolean;  // Whether the player has daubed this cell
  row: number;      // Row index (0-4)
  col: number;      // Column index (0-4)
}

/**
 * A complete bingo card: a 5×5 grid of cells.
 * Indexed as card[row][col].
 */
export type BingoCard = Cell[][];

// ─── Game Result ────────────────────────────────────────

/** A historical round outcome saved for the player's stats. */
export interface GameResult {
  id: string;             // Unique ID (timestamp + random suffix)
  type: 'win' | 'loss';  // Whether the player won or lost
  betAmount: number;      // How much the player wagered
  payout: number;         // How much the player received (0 for losses)
  matchedCount: number;   // How many cells were matched
  at: string;             // ISO timestamp of the result
}

// ─── Game State ─────────────────────────────────────────

/**
 * The full UI state for the game, managed by a useReducer in GameContext.
 * This is NOT the server state — it tracks the client-side UI mode,
 * player's cards, betting, and round data synced from the server.
 */
export interface GameState {
  // --- UI Navigation ---
  mode: 'welcome' | 'select' | 'game' | 'result';  // Current screen
  hasJoinedRound: boolean;                            // Whether player joined this round

  // --- Financials ---
  balance: number;       // Player's current balance
  betAmount: number;     // Current bet amount

  // --- Cards ---
  allCards: BingoCard[];           // All available cards to choose from
  selectedCardIndices: number[];   // Indices of the 2 selected cards
  playerCards: BingoCard[];        // The actual selected card data

  // --- Round Data (synced from server) ---
  calledNumbers: Set<number>;   // Set of called numbers (for O(1) lookup)
  calledNumbersList: number[];  // Ordered list of called numbers
  currentCall: number | null;   // Most recently called number
  gameActive: boolean;          // Whether the round is currently active

  // --- Results ---
  winStatus: 'none' | 'win' | 'loss';
  winAmount: number;
  matchedCount: number;
  results: GameResult[];                 // Historical round outcomes
  insufficientBalanceMessage: string;    // Error message for balance issues
  winnerName?: string | null;           // Name of the round winner
}

// ─── Actions ────────────────────────────────────────────

/**
 * All possible actions that can be dispatched to the game reducer.
 * Each action represents a state transition in the game flow.
 */
export type GameAction =
  // --- Initialization ---
  | { type: 'HYDRATE'; payload: { balance: number; results: GameResult[] } }  // Load saved data from localStorage
  | { type: 'SET_CARDS'; payload: BingoCard[] }                                // Set available cards

  // --- Round lifecycle ---
  | { type: 'SET_JOINED'; payload: boolean }                                   // Mark player as joined/not joined
  | {
    type: 'SYNC_SERVER_ROUND';                                               // Sync round data from server
    payload: {
      phase: 'COUNTDOWN' | 'ACTIVE' | 'ENDED';
      calledNumbers: number[];
      currentCall: number | null;
    };
  }

  // --- Financial actions ---
  | { type: 'DEPOSIT'; payload: number }                                        // Add funds
  | { type: 'WITHDRAW'; payload: number }                                       // Withdraw funds
  | { type: 'SET_BET'; payload: number }                                        // Set bet amount

  // --- Card selection ---
  | { type: 'SELECT_CARDS'; payload: number[] }                                 // Select card indices

  // --- Game flow ---
  | { type: 'START_GAME' }                                                      // Begin a game (deducts bet)
  | { type: 'BEGIN_WAIT' }                                                      // Enter the game view
  | { type: 'START_CALLS' }                                                     // (Deprecated) Server controls this
  | { type: 'BEGIN_DRAW' }                                                      // Enter the game view
  | { type: 'DRAW_NUMBER' }                                                     // (Deprecated) Server controls this
  | { type: 'SHOW_RESULT' }                                                     // Show the result screen
  | { type: 'VIEW_GAME' }                                                       // Switch to game view
  | { type: 'FORCE_WIN' }                                                       // (Deprecated) Server controls this
  | { type: 'MARK_CELL'; payload: { cardIndex: number; row: number; col: number } }  // (Deprecated)
  | { type: 'GAME_LOSS' }                                                       // (Deprecated) Server controls this
  | { type: 'PLAY_AGAIN' }                                                      // Reset and return to welcome

  // --- UI helpers ---
  | { type: 'CLEAR_INSUFFICIENT_BALANCE_MESSAGE' }                              // Dismiss balance error
  | { type: 'SET_WINNER_NAME'; payload: string | null };                        // Set the round winner's name
