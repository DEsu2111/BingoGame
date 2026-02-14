// Shared game data structures and reducer action types.
export interface Cell {
  value: number;
  marked: boolean;
  row: number;
  col: number;
}

export type BingoCard = Cell[][];

export interface GameResult {
  id: string;
  type: 'win' | 'loss';
  betAmount: number;
  payout: number;
  matchedCount: number;
  at: string;
}

export interface GameState {
  mode: 'welcome' | 'select' | 'game' | 'result';
  balance: number;
  betAmount: number;
  allCards: BingoCard[];
  selectedCardIndices: number[];
  playerCards: BingoCard[];
  calledNumbers: Set<number>;
  calledNumbersList: number[];
  currentCall: number | null;
  gameActive: boolean;
  winStatus: 'none' | 'win' | 'loss';
  winAmount: number;
  matchedCount: number;
  results: GameResult[];
  insufficientBalanceMessage: string;
}

export type GameAction =
  | { type: 'HYDRATE'; payload: { balance: number; results: GameResult[] } }
  | { type: 'SET_CARDS'; payload: BingoCard[] }
  | { type: 'DEPOSIT'; payload: number }
  | { type: 'WITHDRAW'; payload: number }
  | { type: 'SET_BET'; payload: number }
  | { type: 'SELECT_CARDS'; payload: number[] }
  | { type: 'START_GAME' }
  | { type: 'BEGIN_DRAW' }
  | { type: 'DRAW_NUMBER' }
  | { type: 'SHOW_RESULT' }
  | { type: 'VIEW_GAME' }
  | { type: 'FORCE_WIN' }
  | { type: 'MARK_CELL'; payload: { cardIndex: number; row: number; col: number } }
  | { type: 'GAME_LOSS' }
  | { type: 'PLAY_AGAIN' }
  | { type: 'CLEAR_INSUFFICIENT_BALANCE_MESSAGE' };
