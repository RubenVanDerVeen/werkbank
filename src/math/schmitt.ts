export type SchmittConfig = 'Inverting' | 'Non-inverting';
export interface SchmittParams { R1_kOhm: number; R2_kOhm: number; Vsat: number; Vref: number; }
export interface SchmittResult { VTp: number; VTn: number; H: number; }
export type XY = { x: number; y: number }[];

export function analyze(config: SchmittConfig, p: SchmittParams): SchmittResult {
  let VTp: number, VTn: number;
  if (config === 'Inverting') {
    const denom = p.R1_kOhm + p.R2_kOhm;
    if (denom === 0) throw new Error('invalid divider');
    const k = p.R1_kOhm / denom;
    const offset = (p.Vref * p.R2_kOhm) / denom;
    VTp = offset + p.Vsat * k;
    VTn = offset - p.Vsat * k;
  } else {
    if (p.R2_kOhm === 0) throw new Error('invalid divider');
    const k = p.R1_kOhm / p.R2_kOhm;
    VTp = p.Vsat * k;
    VTn = -p.Vsat * k;
  }
  return { VTp, VTn, H: VTp - VTn };
}

export function loop(config: SchmittConfig, p: SchmittParams, n = 200): { rising: XY; falling: XY } {
  const { VTp, VTn } = analyze(config, p);
  const span = Math.max(Math.abs(VTp), Math.abs(VTn)) * 1.5 + 1;
  const hi = p.Vsat, lo = -p.Vsat;
  const rising: XY = [], falling: XY = [];
  let s = lo;
  for (let i = 0; i < n; i++) {
    const vin = -span + (2 * span * i) / (n - 1);
    if (config === 'Inverting') { if (vin > VTp) s = lo; else if (vin < VTn) s = hi; }
    else { if (vin > VTp) s = hi; else if (vin < VTn) s = lo; }
    rising.push({ x: vin, y: s });
  }
  s = hi;
  for (let i = n - 1; i >= 0; i--) {
    const vin = -span + (2 * span * i) / (n - 1);
    if (config === 'Inverting') { if (vin > VTp) s = lo; else if (vin < VTn) s = hi; }
    else { if (vin > VTp) s = hi; else if (vin < VTn) s = lo; }
    falling.push({ x: vin, y: s });
  }
  return { rising, falling };
}
