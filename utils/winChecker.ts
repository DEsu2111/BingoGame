import { BingoCard } from '@/types/game';

export function checkWin(card: BingoCard): boolean {
  // Rows
  for (let row = 0; row < 5; row++) {
    if (card[row].every(cell => cell.marked)) return true;
  }

  // Columns
  for (let col = 0; col < 5; col++) {
    if (card.every(row => row[col].marked)) return true;
  }

  // Diagonals
  if (card[0][0].marked && card[1][1].marked && card[2][2].marked && card[3][3].marked && card[4][4].marked)
    return true;
  if (card[0][4].marked && card[1][3].marked && card[2][2].marked && card[3][1].marked && card[4][0].marked)
    return true;

  return false;
}