export type Network = 'fixed' | 'divider' | 'emitter-feedback';

export interface BiasParams {
  VCC: number; beta: number; VBEon: number; VCEsat: number;
  // Present depends on network; unused fields ignored.
  RB?: number; RC: number; RE?: number; R1?: number; R2?: number;
}

export interface BiasResult {
  IB_uA: number; ICmA: number; VCE: number; VCB: number;
  region: 'cutoff' | 'active' | 'saturation';
  loadLine: { iMax_mA: number; vMax: number };
}

export function bias(network: Network, p: BiasParams): BiasResult {
  const r = compute(network, p);
  const iMax = p.VCC / (p.RC + (p.RE ?? 0)); // mA (kΩ → mA)
  return {
    IB_uA: r.IB * 1000, ICmA: r.IC, VCE: r.VCE, VCB: r.VCB,
    region: regionOf(r.IB, r.IC, r.VCB, p.VCEsat),
    loadLine: { iMax_mA: iMax, vMax: p.VCC },
  };
}

function compute(network: Network, p: BiasParams): { IB: number; IC: number; VCE: number; VCB: number } {
  if (network === 'fixed') {
    const IB = (p.VCC - p.VBEon) / (p.RB ?? Infinity); // mA (kΩ)
    const IC = p.beta * IB;
    const VCE = p.VCC - IC * p.RC;
    return { IB, IC, VCE, VCB: VCE - p.VBEon };
  }
  if (network === 'divider') {
    const VB = p.VCC * (p.R2 ?? 0) / ((p.R1 ?? 1) + (p.R2 ?? 0));
    const IE = (VB - p.VBEon) / (p.RE ?? 1); // mA
    const IC = IE * p.beta / (p.beta + 1); // ≈ IE
    const VCE = p.VCC - IC * p.RC - IE * (p.RE ?? 0);
    return { IB: IC / p.beta, IC, VCE, VCB: VCE - p.VBEon };
  }
  return emitterFeedback(p);
}

// ponytail: 3 fixed-point iterations, cubic closed form not worth it
function emitterFeedback(p: BiasParams): { IB: number; IC: number; VCE: number; VCB: number } {
  const RB = p.RB ?? Infinity, RC = p.RC, RE = p.RE ?? 0;
  let IB = (p.VCC - p.VBEon) / RB; // initial guess ignoring RE
  for (let i = 0; i < 3; i++) {
    const IE = (p.beta + 1) * IB;
    IB = (p.VCC - p.VBEon - IE * RE) / RB;
  }
  const IC = p.beta * IB;
  const VCE = p.VCC - IC * RC - (p.beta + 1) * IB * RE;
  return { IB, IC, VCE, VCB: VCE - p.VBEon };
}

function regionOf(IB: number, IC: number, VCB: number, VCEsat: number): 'cutoff' | 'active' | 'saturation' {
  void VCEsat;
  if (IC < 0.001 || IB < 0.00001) return 'cutoff'; // <1 µA
  if (VCB < 0) return 'saturation';
  return 'active';
}
