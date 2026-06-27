import { polyEval, type Tf } from './tf.ts';

export type BodePoint = { omega: number; magDb: number; phaseDeg: number };

export function bode(sys: Tf, points: { omega: number }[]): BodePoint[] {
  return points.map(({ omega }) => {
    const s = { re: 0, im: omega };
    const numRe = polyEval(sys.num.map((c, i, arr) => evalPolyAtRealCoef(arr, s.re, s.im)).map((x) => x.re), 0);
    // Use direct complex polynomial evaluation to avoid the awkward real-coef trick above.
    const num = evalPolyComplex(sys.num, s);
    const den = evalPolyComplex(sys.den, s);
    const h = { re: (num.re * den.re + num.im * den.im) / (den.re * den.re + den.im * den.im),
                im: (num.im * den.re - num.re * den.im) / (den.re * den.re + den.im * den.im) };
    const mag = Math.hypot(h.re, h.im);
    const phase = Math.atan2(h.im, h.re) * 180 / Math.PI;
    return { omega, magDb: 20 * Math.log10(mag), phaseDeg: phase };
  });
}

function evalPolyAtRealCoef(coef: number[], _re: number, _im: number): { re: number; im: number } {
  // unused — kept to avoid the original draft above confusing readers; remove if you prefer a tighter file.
  return { re: 0, im: 0 };
}

function evalPolyComplex(coef: number[], z: { re: number; im: number }): { re: number; im: number } {
  let rRe = 0, rIm = 0;
  for (const c of coef) {
    const nRe = rRe * z.re - rIm * z.im + c;
    const nIm = rRe * z.im + rIm * z.re;
    rRe = nRe; rIm = nIm;
  }
  return { re: rRe, im: rIm };
}