import type { Complex } from './complex.ts';
import { cadd, csub, cmul, cdiv, cscale, cabs } from './complex.ts';

// Γ = (Z - Z0) / (Z + Z0), with Z0 real.
export function zToGamma(z: Complex, z0: number): Complex {
  const z0c: Complex = { re: z0, im: 0 };
  return cdiv(csub(z, z0c), cadd(z, z0c));
}

// Z = Z0 * (1 + Γ) / (1 - Γ), with Z0 real.
export function gammaToZ(g: Complex, z0: number): Complex {
  const one: Complex = { re: 1, im: 0 };
  return cscale(cdiv(cadd(one, g), csub(one, g)), z0);
}

export function swr(g: Complex): number {
  const m = cabs(g);
  if (m === 1) throw new Error('swr: |Γ| = 1 (infinite SWR)');
  return (1 + m) / (1 - m);
}

// Lossless line: Zin = Z0 * (zL + j Z0 tan(βl)) / (Z0 + j zL tan(βl)).
export function zinLossless(zL: Complex, betaL: number, z0: number): Complex {
  const t = Math.tan(betaL);
  const jt: Complex = { re: 0, im: t };
  const jZ0t: Complex = { re: 0, im: z0 * t };
  const num = cadd(zL, jZ0t);
  const z0c: Complex = { re: z0, im: 0 };
  const den = cadd(z0c, cmul(zL, jt));
  return cscale(cdiv(num, den), z0);
}

// Quarter-wave transformer match: Zin = Z0² / zL (zL real).
export function quarterWaveZ(zL: number, z0: number): number {
  if (zL === 0) throw new Error('quarterWaveZ: zL = 0');
  return (z0 * z0) / zL;
}
