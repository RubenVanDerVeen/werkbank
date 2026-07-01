import type { Complex } from './complex.ts';
import { cphaseDeg } from './complex.ts';
import { zinLossless } from './tl.ts';

export function zinSweep(
  zL: Complex, z0: number, betaLStart: number, betaLEnd: number, steps: number,
): { betaL: number; zin: Complex }[] {
  const out: { betaL: number; zin: Complex }[] = [];
  const dt = (betaLEnd - betaLStart) / (steps - 1);
  for (let i = 0; i < steps; i++) {
    const betaL = betaLStart + i * dt;
    out.push({ betaL, zin: zinLossless(zL, betaL, z0) });
  }
  return out;
}

// ponytail: positions in wavelengths, assumes |Gamma| < 1
export function vmaxPosition(gamma: Complex): number {
  const angleDeg = cphaseDeg(gamma);
  const pos = (1 - angleDeg / 360) / 2;
  return ((pos % 0.5) + 0.5) % 0.5;
}

export function vminPosition(gamma: Complex): number {
  return (vmaxPosition(gamma) + 0.25) % 0.5;
}