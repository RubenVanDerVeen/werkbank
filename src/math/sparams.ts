import type { Complex } from './complex.ts';
import { cadd, csub, cmul, cdiv, cabs, cscale } from './complex.ts';

export type SParams = { S11: Complex; S21: Complex; S12: Complex; S22: Complex };
export type ZParams = { Z11: Complex; Z12: Complex; Z21: Complex; Z22: Complex };

export function sToZ(s: SParams, z0: number): ZParams {
  const one: Complex = { re: 1, im: 0 };
  const denom = csub(
    cmul(csub(one, s.S11), csub(one, s.S22)),
    cmul(s.S12, s.S21),
  );
  const num11 = cadd(cmul(cadd(one, s.S11), csub(one, s.S22)), cmul(s.S12, s.S21));
  const num22 = cadd(cmul(csub(one, s.S11), cadd(one, s.S22)), cmul(s.S12, s.S21));
  const two: Complex = { re: 2, im: 0 };
  return {
    Z11: cscale(cdiv(num11, denom), z0),
    Z12: cscale(cdiv(cmul(two, s.S12), denom), z0),
    Z21: cscale(cdiv(cmul(two, s.S21), denom), z0),
    Z22: cscale(cdiv(num22, denom), z0),
  };
}

export function returnLoss(s11: Complex): number {
  return -20 * Math.log10(cabs(s11));
}

export function insertionLoss(s21: Complex): number {
  return -20 * Math.log10(cabs(s21));
}

export function transducerGain(s21: Complex): number {
  return 10 * Math.log10(cabs(s21) ** 2);
}

export function isStable(s: SParams): { K: number; delta: number; stable: boolean } {
  const delta = cabs(csub(cmul(s.S11, s.S22), cmul(s.S12, s.S21)));
  const s12s21 = cabs(cmul(s.S12, s.S21));
  const K = (1 - cabs(s.S11) ** 2 - cabs(s.S22) ** 2 + delta ** 2) / (2 * s12s21);
  // ponytail: unilateral (S12=0) -> s12s21=0 -> K=Inf -> stable
  const stable = s12s21 === 0 ? delta < 1 : K > 1 && delta < 1;
  return { K, delta, stable };
}