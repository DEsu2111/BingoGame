import { BingoCard } from '@/types/game';

const COLUMN_RANGES = [
  [1, 15],
  [16, 30],
  [31, 45],
  [46, 60],
  [61, 75],
];

function generateSingleCard(): BingoCard {
  const card: BingoCard = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => ({
      value: 0,
      marked: false,
      row,
      col,
    })),
  );

  for (let col = 0; col < 5; col += 1) {
    const [min, max] = COLUMN_RANGES[col];
    const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

    for (let i = options.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    const picked = options.slice(0, 5);
    for (let row = 0; row < 5; row += 1) {
      card[row][col].value = picked[row];
    }
  }

  card[2][2] = {
    value: 0,
    marked: true,
    row: 2,
    col: 2,
  };

  return card;
}

function cardsAreEqual(cardA: BingoCard, cardB: BingoCard): boolean {
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      if (cardA[row][col].value !== cardB[row][col].value) return false;
    }
  }
  return true;
}

export function generateCards(count: number): BingoCard[] {
  const cards: BingoCard[] = [];

  while (cards.length < count) {
    const next = generateSingleCard();
    if (!cards.some((card) => cardsAreEqual(card, next))) {
      cards.push(next);
    }
  }

  return cards;
}
