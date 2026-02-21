import { BingoCard, Cell } from '@/types/game';

// Generate a single 5x5 card of Cell objects with free center marked.
export function generateCard(): BingoCard {
  const ranges: Array<[number, number]> = [
    [1, 15],
    [16, 30],
    [31, 45],
    [46, 60],
    [61, 75],
  ];

  const cols = ranges.map(([min, max]) => {
    const nums: number[] = [];
    while (nums.length < 5) {
      const n = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!nums.includes(n)) nums.push(n);
    }
    return nums.sort((a, b) => a - b);
  });

  return Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => {
      const isCenter = r === 2 && c === 2;
      const value = isCenter ? 0 : cols[c][r];
      return {
        value,
        marked: isCenter, // free space auto-marked
        row: r,
        col: c,
      } as Cell;
    }),
  );
}

// Generate multiple cards; ensures uniqueness by regenerating on collision.
export function generateCards(count: number): BingoCard[] {
  const cards: BingoCard[] = [];
  const seen = new Set<string>();

  const serialize = (card: BingoCard) => card.flat().map((c) => c.value).join(',');

  while (cards.length < count) {
    const card = generateCard();
    const key = serialize(card);
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push(card);
  }

  return cards;
}
