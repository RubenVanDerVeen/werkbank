import type { Complex } from './complex.ts';

export interface Circle {
  cx: number;
  cy: number;
  radius: number;
}

// Y = 1/Z (complex reciprocal). Inlined rather than cdiv({1,0}, z) so that Z=0
// deterministically yields NaN (1/0 = inf) instead of depending on cdiv's
// divide-by-zero path. ponytail: 1/(re + j im) = (re - j im) / (re^2 + im^2).
export function admittanceFromImpedance(z: Complex): Complex {
  const d = z.re * z.re + z.im * z.im;
  return { re: z.re / d, im: -z.im / d };
}

// Constant-resistance circle in the Gamma-plane for normalized resistance r (r >= 0).
// r = 0 is the outer unit-boundary circle.
export function constantRCircle(r: number): Circle {
  const d = 1 + r;
  return { cx: r / d, cy: 0, radius: 1 / d };
}

// Constant-reactance circle in the Gamma-plane for normalized reactance x.
// x = 0 is the real axis (degenerate); 1/0 = Infinity and the overlay helper
// skips non-finite radii. ponytail: no special-case / throw for the degenerate circle.
export function constantXCircle(x: number): Circle {
  return { cx: 1, cy: 1 / x, radius: 1 / Math.abs(x) };
}
