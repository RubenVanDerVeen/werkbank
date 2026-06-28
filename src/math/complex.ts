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
