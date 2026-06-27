export type RouthRow = number[];

export type AuxWarning =
  | { kind: 'none' }
  | { kind: 'auxiliary'; rowIndex: number; poly: number[] };

export function routhArray(coef: number[]): RouthRow[] {
  if (coef.length < 2) throw new Error('need at least degree-1 polynomial');
  const even: RouthRow = [];
  const odd: RouthRow = [];
  for (let i = 0; i < coef.length; i++) {
    (i % 2 === 0 ? even : odd).push(coef[i]!);
  }
  const rows: RouthRow[] = [even, odd];
  while (rows.length < coef.length) {
    const prev = rows[rows.length - 1]!;
    const prev2 = rows[rows.length - 2]!;
    const cols = Math.max(prev.length, prev2.length);
    const next: RouthRow = new Array(cols).fill(0);
    const firstColPrev = prev[0]!;
    if (firstColPrev === 0) {
      rows.push(next);
      continue;
    }
    for (let j = 0; j < cols - 1; j++) {
      const a = prev2[j + 1] ?? 0;
      const b = prev[j + 1] ?? 0;
      next[j] = (firstColPrev * a - (prev2[0] ?? 0) * b) / firstColPrev;
    }
    rows.push(next);
  }
  return rows;
}

export function routhStability(coef: number[]): 'stable' | 'unstable' {
  const rows = routhArray(coef);
  const firstCol = rows.map((r) => r[0] ?? 0);
  if (firstCol.some((v) => v === 0)) return 'unstable';
  let signChanges = 0;
  for (let i = 1; i < firstCol.length; i++) {
    const a = firstCol[i - 1]!;
    const b = firstCol[i]!;
    if ((a > 0 && b < 0) || (a < 0 && b > 0)) signChanges++;
  }
  return signChanges === 0 ? 'stable' : 'unstable';
}

export function auxiliaryEquationWarning(coef: number[]): AuxWarning {
  const rows = routhArray(coef);
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    if (row.every((v) => v === 0)) {
      const above = rows[i - 1]!;
      const degree = coef.length - i;
      const poly: number[] = new Array(degree + 1).fill(0);
      for (let j = 0; j < above.length; j++) {
        poly[degree - 2 * j] = above[j] ?? 0;
      }
      return { kind: 'auxiliary', rowIndex: i, poly };
    }
  }
  return { kind: 'none' };
}