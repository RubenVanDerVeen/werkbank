import type { Tf } from './tf.ts';
import { magPhaseAtJw } from './complex.ts';

export type BodePoint = { omega: number; magDb: number; phaseDeg: number };

export function bode(sys: Tf, points: { omega: number }[]): BodePoint[] {
  return points.map(({ omega }) => ({ omega, ...magPhaseAtJw(sys, omega) }));
}
