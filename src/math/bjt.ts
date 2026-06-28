export type Config = 'CE' | 'CB' | 'CC';

export function hybridPi(beta: number, ICmA: number, VTmV: number): { gm_mS: number; rpi_kOhm: number } {
  const gm = (1000 * ICmA) / VTmV; // mA/mV = S, ×1000 → mS
  const rpi = beta / gm; // kΩ (β / mS = kΩ)
  return { gm_mS: gm, rpi_kOhm: rpi };
}

export interface BjtParams {
  beta: number; ICmA: number; VTmV: number;
  RC_kOhm: number; RE_kOhm: number; RL_kOhm: number; Rs_kOhm: number; RB_kOhm: number;
  REbypassed: boolean;
}

export interface BjtResult {
  Av: number; Ai: number;
  Zin_device_kOhm: number; Zin_kOhm: number; Zout_kOhm: number;
}

// ponytail: 2x2 Cramer's rule nodal solve; if a 3rd node ever needed, swap to a tiny linear-solve helper.
// Conductances in mS, resistances in kΩ (1/kΩ = mS), so gm·R is dimensionless = voltage gain.
const G_IDEAL = 1e12; // ideal source / AC-short conductance (mS): Rs=0 or bypassed RE

export function analyze(config: Config, p: BjtParams): BjtResult {
  const { gm_mS: gm, rpi_kOhm: rpi } = hybridPi(p.beta, p.ICmA, p.VTmV);
  const beta = p.beta;
  const RC = config === 'CC' ? 0 : p.RC_kOhm;
  const RL = p.RL_kOhm;
  const Rs = p.Rs_kOhm;
  const RB = p.RB_kOhm;

  // Small-signal equivalent (mid-band, caps = AC short):
  //   vs -- Rs -- (node b) -- rpi -- (node e) -- RE -- gnd
  //                      |              |
  //                     RB             gm·vpi (VCCS from e to c)
  //                      v
  //   (node c) -- RC -- gnd, also RL to gnd.
  // For CE: input at b, output at c, emitter at e. Bypassed RE → emitter at AC gnd (cap short).
  // For CB: input at e, output at c, base at AC gnd (b fixed).
  // For CC: input at b, output at e, collector at AC gnd (c fixed).
  // Solve 2x2 for (vb, ve) or (ve, vc) depending on config; Av = vout/vs.

  if (config === 'CE') return solveCE(gm, rpi, beta, RC, RL, p.RE_kOhm, Rs, RB, p.REbypassed);
  if (config === 'CB') return solveCB(gm, rpi, RC, RL, p.RE_kOhm, Rs);
  return solveCC(gm, rpi, beta, p.RE_kOhm, RL, Rs, RB);
}

function parallel(a: number, b: number): number {
  if (a === Infinity) return b;
  if (b === Infinity) return a;
  return (a * b) / (a + b);
}

// CE: nodes vb, ve. vs = Rs·i_s + vb. KCL at vb: (vb-vs)/Rs + vb/RB + (vb-ve)/rpi = 0
//   → vb·(gRs + 1/RB + 1/rpi) - ve·(1/rpi) = vs·gRs
// KCL at ve: (ve-vb)/rpi + ve·gRE - gm·(vb-ve) = 0   (VCCS pulls ve→c; c at AC gnd via RC||RL)
//   → -vb·(1/rpi + gm) + ve·(1/rpi + gm + gRE) = 0
// Bypassed RE → gRE = G_IDEAL (emitter at AC gnd via cap); Rs=0 → gRs = G_IDEAL (ideal source).
// 1/RB with RB=∞ = 0 in JS (no guard needed).
function solveCE(gm: number, rpi: number, beta: number, RC: number, RL: number, RE: number, Rs: number, RB: number, bypassed: boolean): BjtResult {
  const gRs = Rs > 0 ? 1/Rs : G_IDEAL;
  const gRE = bypassed ? G_IDEAL : (RE > 0 ? 1/RE : 0);
  const a11 = gRs + 1/RB + 1/rpi;
  const a12 = -1/rpi;
  const a21 = -(1/rpi + gm);
  const a22 = 1/rpi + gm + gRE;
  const b1 = gRs; // vs coefficient (set vs=1)
  const b2 = 0;
  const det = a11*a22 - a12*a21;
  const vb = (b1*a22 - a12*b2)/det;
  const ve = (a11*b2 - a21*b1)/det;
  const vpi = vb - ve;
  // vc = -gm·vpi·(RC||RL) (sign: current pulled out of c → vc negative if vpi>0).
  const vc = -gm * vpi * parallel(RC, RL);
  const Av = vc; // vs=1
  // Zin_device: looking into base. Bypassed → rpi; unbypassed with RE>0 → rpi + (β+1)·RE.
  const Zin_device = (!bypassed && RE > 0) ? rpi + (beta + 1) * RE : rpi;
  const Zin = parallel(RB, Zin_device);
  const Zout = RC; // ro omitted
  const Ai = Av * Zin / RL;
  return { Av, Ai, Zin_device_kOhm: Zin_device, Zin_kOhm: Zin, Zout_kOhm: Zout };
}

// CB: base at AC gnd. Input at e through Rs. Nodes ve, vc.
//   KCL at ve: (ve-vs)/Rs + ve/RE + ve/rpi - gm·(-ve) = 0 → ve·(gRs + 1/RE + 1/rpi + gm) = vs·gRs
//   (vpi = vb-ve = -ve, so gm·vpi pulls c→e; positive ve pushes vc positive.)
//   KCL at vc: vc/(RC||RL) + gm·(-ve) = 0 → vc = gm·ve·(RC||RL).
function solveCB(gm: number, rpi: number, RC: number, RL: number, RE: number, Rs: number): BjtResult {
  // base at AC gnd; RB irrelevant for CB Zin (base is grounded for signal)
  const gRs = Rs > 0 ? 1/Rs : G_IDEAL;
  const RL_eff = parallel(RC, RL);
  const ve = gRs / (gRs + 1/RE + 1/rpi + gm); // vs=1
  const vc = gm * ve * RL_eff;
  const Av = vc;
  // Zin_device at emitter: 1 / (1/RE + 1/rpi + gm) ≈ rpi/(β+1) when RE large.
  const Zin_device = 1 / (1/RE + 1/rpi + gm);
  const Zin = Zin_device; // RB doesn't load emitter
  const Zout = RC;
  const Ai = Av * Zin / RL;
  return { Av, Ai, Zin_device_kOhm: Zin_device, Zin_kOhm: Zin, Zout_kOhm: Zout };
}

// CC: collector at AC gnd. Input at b through Rs + RB. Output at e.
//   Nodes vb, ve. KCL at vb: (vb-vs)/Rs + vb/RB + (vb-ve)/rpi = 0.
//   KCL at ve: (ve-vb)/rpi + ve/RE + ve/RL + gm·(vb-ve) = 0  (VCCS pulls e→c, c at gnd)
//   → -vb·(1/rpi + gm) + ve·(1/rpi + gm + 1/RE + 1/RL) = 0
function solveCC(gm: number, rpi: number, beta: number, RE: number, RL: number, Rs: number, RB: number): BjtResult {
  const gRs = Rs > 0 ? 1/Rs : G_IDEAL;
  const a11 = gRs + 1/RB + 1/rpi;
  const a12 = -1/rpi;
  const a21 = -(1/rpi + gm);
  const a22 = 1/rpi + gm + 1/RE + 1/RL;
  const b1 = gRs;
  const b2 = 0;
  const det = a11*a22 - a12*a21;
  const vb = (b1*a22 - a12*b2)/det;
  const ve = (a11*b2 - a21*b1)/det;
  const Av = ve; // vs=1
  const Zin_device = rpi + (beta + 1) * parallel(RE, RL);
  const Zin = parallel(RB, Zin_device);
  const Zout = parallel((rpi + Rs) / (beta + 1), RE); // emitter-follower Zout incl. Rs; → 1/gm when Rs small
  const Ai = Av * Zin / RL;
  return { Av, Ai, Zin_device_kOhm: Zin_device, Zin_kOhm: Zin, Zout_kOhm: Zout };
}
