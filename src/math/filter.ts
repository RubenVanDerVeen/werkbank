import type { Tf } from './tf.ts';

export type FilterType = 'LP' | 'HP' | 'BP';
export interface FilterDesign { f0_Hz: number; Q: number; gain: number; tf: Tf; }

export function design(type: FilterType, R1_k: number, R2_k: number, C1_n: number, C2_n: number): FilterDesign {
  const R1 = R1_k * 1e3, R2 = R2_k * 1e3, C1 = C1_n * 1e-9, C2 = C2_n * 1e-9;
  const prod = R1 * R2 * C1 * C2;
  if (prod <= 0) throw new Error('invalid R/C values');
  const w0 = 1 / Math.sqrt(prod);
  let Q: number, tf: Tf, gain = 1;
  if (type === 'LP') {
    Q = Math.sqrt(prod) / (C2 * (R1 + R2));
    tf = { num: [w0 * w0], den: [1, w0 / Q, w0 * w0] };
  } else if (type === 'HP') {
    Q = Math.sqrt(prod) / (R2 * (C1 + C2));
    tf = { num: [1, 0, 0], den: [1, w0 / Q, w0 * w0] };
  } else {
    Q = Math.sqrt(prod) / (C2 * (R1 + R2));
    tf = { num: [(w0 / Q), 0], den: [1, w0 / Q, w0 * w0] };
    gain = 1;
  }
  return { f0_Hz: w0 / (2 * Math.PI), Q, gain, tf };
}

export function bodePoints(type: FilterType, R1: number, R2: number, C1: number, C2: number, n = 160) {
  const d = design(type, R1, R2, C1, C2);
  const w0 = 2 * Math.PI * d.f0_Hz;
  const lo = Math.log10(w0 / 1000), hi = Math.log10(w0 * 1000);
  const pts: { omega: number }[] = [];
  for (let i = 0; i < n; i++) pts.push({ omega: 10 ** (lo + ((hi - lo) * i) / (n - 1)) });
  return { design: d, omegas: pts };
}