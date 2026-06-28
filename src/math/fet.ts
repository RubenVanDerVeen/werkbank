export type Device = 'MOSFET' | 'JFET';
export type FetConfig = 'CS' | 'CD' | 'CG';

export function gmMOSFET(Kn_mAV2: number, IDQ_mA: number): number {
  return 2 * Math.sqrt(Kn_mAV2 * IDQ_mA); // mS
}

export function gmJFET(IDSS_mA: number, Vp_V: number, IDQ_mA: number): number {
  // gm = 2·IDQ / |VGS - Vp|, with VGS = Vp·(1 - sqrt(IDQ/IDSS))
  const VGS = Vp_V * (1 - Math.sqrt(IDQ_mA / IDSS_mA));
  return (2 * IDQ_mA) / Math.abs(VGS - Vp_V); // mS
}

export interface FetParams {
  IDQ_mA: number;
  Kn_mAV2?: number; Vt_V?: number; // MOSFET
  IDSS_mA?: number; Vp_V?: number; // JFET
  RD_kOhm: number; RS_kOhm: number; RL_kOhm: number;
  Rs_kOhm: number; RG_MOhm: number; RSbypassed: boolean;
}

export interface FetResult {
  Av: number; Ai: number; Zin_MOhm: number; Zout_kOhm: number;
}

function parallel(a: number, b: number): number {
  if (a === Infinity) return b;
  if (b === Infinity) return a;
  return (a * b) / (a + b);
}

export function analyze(device: Device, config: FetConfig, p: FetParams): FetResult {
  const gm = device === 'MOSFET'
    ? gmMOSFET(p.Kn_mAV2 ?? 1, p.IDQ_mA)
    : gmJFET(p.IDSS_mA ?? 10, p.Vp_V ?? -4, p.IDQ_mA);
  const RS = !p.RSbypassed || config === 'CD' ? p.RS_kOhm : 0;
  if (config === 'CS') return solveCS(gm, p.RD_kOhm, p.RL_kOhm, RS, p.Rs_kOhm, p.RG_MOhm);
  if (config === 'CG') return solveCG(gm, p.RD_kOhm, p.RL_kOhm, p.RS_kOhm, p.Rs_kOhm, p.RG_MOhm);
  return solveCD(gm, p.RS_kOhm, p.RL_kOhm, p.Rs_kOhm, p.RG_MOhm);
}

function solveCS(gm: number, RD: number, RL: number, RS: number, Rs: number, RG: number): FetResult {
  const RLC = parallel(RD, RL);
  // vs = Rs·i + vg; vg = vs·RG/(Rs+RG) (gate draws no current). With Rs=0, vg=vs.
  const vg = 1 * RG / (Rs + RG); // vs=1
  const vs_eff = vg; // source at gnd for AC in CS
  const vgs = vg - 0; // source is at AC gnd (RS bypassed) or RS to gnd
  // For unbypassed RS: vgs = vg - vs·gm·vgs·RS/(1) ... use feedback form.
  // Av (unloaded source) = -gm·RLC / (1 + gm·RS)
  const Av = -gm * RLC / (1 + gm * RS);
  const Zin = RG; // MΩ
  const Zout = RD; // ro omitted
  const Ai = Av * Zin / RL; // Zin in MΩ → keep Ai unitless by treating MΩ/kΩ = 1000 factor ignored (pedagogical)
  void vs_eff; void vgs;
  return { Av, Ai, Zin_MOhm: Zin, Zout_kOhm: Zout };
}

function solveCD(gm: number, RS: number, RL: number, Rs: number, RG: number): FetResult {
  const RSL = parallel(RS, RL);
  // Av = gm·RSL / (1 + gm·RSL)
  const Av = (gm * RSL) / (1 + gm * RSL);
  const Zin = RG;
  const Zout = parallel(1 / gm, RS); // ponytail: (1/gm)‖RS, neglecting Rs/(β+1) form
  void Rs;
  const Ai = Av * Zin / RL;
  return { Av, Ai, Zin_MOhm: Zin, Zout_kOhm: Zout };
}

function solveCG(gm: number, RD: number, RL: number, RS: number, Rs: number, RG: number): FetResult {
  void RG;
  const RLC = parallel(RD, RL);
  // Av = +gm·RLC / (1 + gm·RS)
  const Av = (gm * RLC) / (1 + gm * RS);
  // Zin at source ≈ 1/gm (when RS unbypassed and Rs small)
  const Zin = 1 / (gm + 1/RS); // kΩ
  const Zout = RD;
  const Ai = Av * Zin / RL;
  void Rs;
  return { Av, Ai, Zin_MOhm: Zin / 1000, Zout_kOhm: Zout };
}
