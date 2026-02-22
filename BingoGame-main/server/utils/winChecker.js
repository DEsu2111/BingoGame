// Return true if any row/col/diag is fully marked (FREE counts as marked)
export function checkWin(marked) {
  const isMarked = (r, c) => marked.has(`${r}-${c}`) || (r === 2 && c === 2);

  const rows = Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => isMarked(r, c)));
  // rows
  if (rows.some(row => row.every(Boolean))) return true;
  // cols
  for (let c = 0; c < 5; c++) {
    if (rows.every(row => row[c])) return true;
  }
  // diags
  if ([0, 1, 2, 3, 4].every(i => rows[i][i])) return true;
  if ([0, 1, 2, 3, 4].every(i => rows[i][4 - i])) return true;
  return false;
}
