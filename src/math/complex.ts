import type { Tf } from './tf.ts';

export type Complex = { re: number; im: number };

export const cadd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
export const csub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im });
export const cmul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
export const cscale = (a: Complex, k: number): Complex => ({ re: a.re * k, im: a.im * k });
export function cdiv(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im;
  if (d === 0) throw new Error('cdiv: division by zero');
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
export const cabs = (a: Complex): number => Math.hypot(a.re, a.im);
export const cphaseDeg = (a: Complex): number => (Math.atan2(a.im, a.re) * 180) / Math.PI;
export const fromPolar = (mag: number, phaseDeg: number): Complex => {
  const r = (phaseDeg * Math.PI) / 180;
  return { re: mag * Math.cos(r), im: mag * Math.sin(r) };
};

function evalPolyAtJw(coef: number[], omega: number): Complex {
  let acc: Complex = { re: 0, im: 0 };
  const s: Complex = { re: 0, im: omega };
  for (const c of coef) acc = cadd(cmul(acc, s), { re: c, im: 0 });
  return acc;
}

export function evalTfAtJw(tf: Tf, omega: number): Complex {
  return cdiv(evalPolyAtJw(tf.num, omega), evalPolyAtJw(tf.den, omega));
}

export function magPhaseAtJw(tf: Tf, omega: number): { magDb: number; phaseDeg: number } {
  const h = evalTfAtJw(tf, omega);
  return { magDb: 20 * Math.log10(cabs(h)), phaseDeg: cphaseDeg(h) };
}
