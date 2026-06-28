export type OscType = 'Wien' | 'Phase-shift' | 'Colpitts' | 'Hartley';
export interface OscParams {
  R_kOhm?: number; C_nF?: number;
  L_mH?: number; C1_nF?: number; C2_nF?: number;
  L1_mH?: number; L2_mH?: number;
}
export interface OscResult { f0_Hz: number; AvMin: number; ratio?: number; }

const TWO_PI = 2 * Math.PI;

export function analyze(type: OscType, p: OscParams): OscResult {
  if (type === 'Wien') {
    const R = (p.R_kOhm ?? 0) * 1e3, C = (p.C_nF ?? 0) * 1e-9;
    return { f0_Hz: 1 / (TWO_PI * R * C), AvMin: 3 };
  }
  if (type === 'Phase-shift') {
    const R = (p.R_kOhm ?? 0) * 1e3, C = (p.C_nF ?? 0) * 1e-9;
    return { f0_Hz: 1 / (TWO_PI * R * C * Math.sqrt(6)), AvMin: 29 };
  }
  if (type === 'Colpitts') {
    const L = (p.L_mH ?? 0) * 1e-3, C1 = (p.C1_nF ?? 0) * 1e-9, C2 = (p.C2_nF ?? 0) * 1e-9;
    const Cs = (C1 * C2) / (C1 + C2);
    if (L * Cs <= 0) throw new Error('invalid L/C values');
    return { f0_Hz: 1 / (TWO_PI * Math.sqrt(L * Cs)), AvMin: C2 / C1, ratio: C2 / C1 };
  }
  const L1 = (p.L1_mH ?? 0) * 1e-3, L2 = (p.L2_mH ?? 0) * 1e-3, C = (p.C_nF ?? 0) * 1e-9;
  if ((L1 + L2) * C <= 0) throw new Error('invalid L/C values');
  return { f0_Hz: 1 / (TWO_PI * Math.sqrt((L1 + L2) * C)), AvMin: L1 / L2, ratio: L1 / L2 };
}

export function wienBetaPoints(R_kOhm: number, C_nF: number, n = 160) {
  const R = R_kOhm * 1e3, C = C_nF * 1e-9;
  const w0 = 1 / (R * C);
  const lo = Math.log10(w0 / 100), hi = Math.log10(w0 * 100);
  const out: { omega: number; magDb: number; phaseDeg: number }[] = [];
  for (let i = 0; i < n; i++) {
    const w = 10 ** (lo + ((hi - lo) * i) / (n - 1));
    const x = w * R * C;
    const reDen = 3, imDen = x - 1 / x;
    const mag = 1 / Math.hypot(reDen, imDen);
    const phase = -(Math.atan2(imDen, reDen) * 180) / Math.PI;
    out.push({ omega: w, magDb: 20 * Math.log10(mag), phaseDeg: phase });
  }
  return out;
}