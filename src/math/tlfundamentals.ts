import type { Complex } from './complex.ts';
import { cdiv, cmul } from './complex.ts';

// ponytail: local csqrt — complex.ts lacks it; promote there if a third caller appears.
function csqrt(z: Complex): Complex {
  const { re: a, im: b } = z;
  const r = Math.hypot(a, b);
  const u = Math.sqrt((r + a) / 2);
  const v = (b < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (r - a) / 2));
  return { re: u, im: v };
}

// Z0 = sqrt((R + jωL) / (G + jωC)).
export function characteristicImpedance(R: number, L: number, G: number, C: number, omega: number): Complex {
  const num: Complex = { re: R, im: omega * L };
  const den: Complex = { re: G, im: omega * C };
  return csqrt(cdiv(num, den));
}

// γ = sqrt((R + jωL)(G + jωC)) = α + jβ.
export function propagationConstant(
  R: number, L: number, G: number, C: number, omega: number,
): { alpha: number; beta: number; gamma: Complex } {
  const zSeries: Complex = { re: R, im: omega * L };
  const yShunt: Complex = { re: G, im: omega * C };
  const gamma = csqrt(cmul(zSeries, yShunt));
  return { alpha: gamma.re, beta: gamma.im, gamma };
}

// Lossless phase velocity v = 1/sqrt(LC).
export function phaseVelocity(L: number, C: number): number {
  return 1 / Math.sqrt(L * C);
}

// Heaviside distortionless condition: R/L = G/C.
export function isDistortionless(R: number, L: number, G: number, C: number): boolean {
  // ponytail: relative tol 1e-6; physical components drift far more.
  const rl = R / L, gc = G / C;
  if (!Number.isFinite(rl) || !Number.isFinite(gc)) return false;
  return Math.abs(rl - gc) <= 1e-6 * Math.max(Math.abs(rl), Math.abs(gc), 1);
}

// Lossless Z0 = sqrt(L/C) (real).
export function losslessZ0(L: number, C: number): number {
  return Math.sqrt(L / C);
}
