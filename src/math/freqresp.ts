export interface FreqRespParams {
  gm_mS: number; Rsig_kOhm: number; Rin_kOhm: number; RC_kOhm: number; RL_kOhm: number;
  Cpi_pF: number; Cmu_pF: number; C1_uF: number; C2_uF: number;
}
export interface FreqRespResult {
  Amid: number; AmidDb: number; fL_Hz: number; fH_Hz: number; BW_Hz: number;
}

const par = (a: number, b: number) => (a * b) / (a + b);
const TWO_PI = 2 * Math.PI;

export function analyze(p: FreqRespParams): FreqRespResult {
  const RLp = par(p.RC_kOhm, p.RL_kOhm);
  const Amid = -p.gm_mS * RLp; // mS·kΩ = unitless
  const Cin = p.Cpi_pF + p.Cmu_pF * (1 + Math.abs(Amid)); // pF
  const Rth = par(p.Rsig_kOhm, p.Rin_kOhm); // kΩ
  const fH = 1e9 / (TWO_PI * Rth * Cin); // kΩ·pF → Hz
  const fL1 = 1e3 / (TWO_PI * (p.Rsig_kOhm + p.Rin_kOhm) * p.C1_uF); // kΩ·µF → Hz
  const fL2 = 1e3 / (TWO_PI * (p.RC_kOhm + p.RL_kOhm) * p.C2_uF);
  const fL = Math.max(fL1, fL2);
  return { Amid, AmidDb: 20 * Math.log10(Math.abs(Amid)), fL_Hz: fL, fH_Hz: fH, BW_Hz: fH - fL };
}

// Band-pass model points for the Bode plot.
export function bodePoints(p: FreqRespParams, n = 120): { omega: number; magDb: number; phaseDeg: number }[] {
  const { Amid, fL_Hz, fH_Hz } = analyze(p);
  const wL = TWO_PI * fL_Hz, wH = TWO_PI * fH_Hz;
  const lo = Math.log10(wL / 100), hi = Math.log10(wH * 100);
  const out: { omega: number; magDb: number; phaseDeg: number }[] = [];
  for (let i = 0; i < n; i++) {
    const w = 10 ** (lo + ((hi - lo) * i) / (n - 1));
    // H = Amid · (jw/wL)/(1+jw/wL) · 1/(1+jw/wH)
    const xL = w / wL, xH = w / wH;
    const lowMag = xL / Math.hypot(1, xL);
    const highMag = 1 / Math.hypot(1, xH);
    const mag = Math.abs(Amid) * lowMag * highMag;
    const phase = 180 + (90 - (Math.atan(xL) * 180) / Math.PI) - (Math.atan(xH) * 180) / Math.PI;
    out.push({ omega: w, magDb: 20 * Math.log10(mag), phaseDeg: phase });
  }
  return out;
}
