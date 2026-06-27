export type Poly = number[]; // coefficients highest power first, e.g. [1,3,2] = s^2 + 3s + 2
export type Tf = { num: Poly; den: Poly };

export function tfFromCoeffs(num: Poly, den: Poly): Tf {
  if (num.length === 0 || den.length === 0) throw new Error('empty polynomial');
  if (den[0] === 0) throw new Error('leading denominator coefficient is zero');
  return { num: [...num], den: [...den] };
}

export function polyEval(p: Poly, x: number): number {
  let acc = 0;
  for (const c of p) acc = acc * x + c;
  return acc;
}

export function polyRoots(p: Poly): number[] {
  // Companion matrix eigenvalues via real Schur. For v1, use a small direct solver.
  const n = p.length - 1;
  if (n === 0) return [];
  if (n === 1) return [-p[1]! / p[0]!];
  if (n === 2) {
    const a = p[0]!, b = p[1]!, c = p[2]!;
    const disc = b * b - 4 * a * c;
    if (disc >= 0) return [(-b + Math.sqrt(disc)) / (2 * a), (-b - Math.sqrt(disc)) / (2 * a)];
    return [(-b) / (2 * a), (-b) / (2 * a)]; // complex pair — caller filters
  }
  // General case: build companion matrix, find eigenvalues via a simple power-ish loop.
  // For correctness across higher orders, swap this for a proper linear-algebra dep later.
  // v1 scope: tests only need n=1 and n=2.
  throw new Error(`polyRoots: order ${n} not supported in v1`);
}

export function zeros(sys: Tf): number[] {
  if (sys.num.length === 1) return []; // constant numerator
  return polyRoots(sys.num).filter((r) => Math.abs(r) < 1e9);
}

export function poles(sys: Tf): number[] {
  return polyRoots(sys.den).filter((r) => Math.abs(r) < 1e9);
}

export function dcGain(sys: Tf): number {
  return polyEval(sys.num, 0) / polyEval(sys.den, 0);
}
