export function checkWin(marked: Set<string>): boolean {
  const isMarked = (r: number, c: number) => marked.has(`${r}-${c}`) || (r === 2 && c === 2);
  const grid = Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => isMarked(r, c)));

  if (grid.some(row => row.every(Boolean))) return true;
  for (let c = 0; c < 5; c++) if (grid.every(row => row[c])) return true;
  if ([0,1,2,3,4].every(i => grid[i][i])) return true;
  if ([0,1,2,3,4].every(i => grid[i][4-i])) return true;
  return false;
}
