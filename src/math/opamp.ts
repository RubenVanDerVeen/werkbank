export type Config = 'inverting' | 'non-inverting' | 'follower' | 'summing' | 'difference';

export interface OpampParams {
  R1?: number; R2?: number; Rf?: number; Rg?: number; // kΩ
  Vcc: number; Vin?: number; V1?: number; V2?: number;
}

export interface OpampResult {
  Av: number;
  Vout: number;
  Zin_kOhm: number;
  region: 'linear' | 'saturated (+)' | 'saturated (-)';
  transferExpr: string;
}

const EPS = 1e-3;

export function analyze(config: Config, p: OpampParams): OpampResult {
  const { Vcc } = p;
  let Av: number, Vout_ideal: number, Zin: number, expr: string;

  switch (config) {
    case 'inverting': {
      if ((p.R1 ?? 0) === 0) throw new Error('R1 must be > 0');
      Av = -(p.Rf ?? 0) / (p.R1 ?? 1);
      Vout_ideal = Av * (p.Vin ?? 0);
      Zin = p.R1 ?? 0;
      expr = `Vout = -(Rf/R1)·Vin = ${Av.toFixed(2)}·Vin`;
      break;
    }
    case 'non-inverting': {
      if ((p.Rg ?? 0) === 0) throw new Error('Rg must be > 0');
      Av = 1 + (p.Rf ?? 0) / (p.Rg ?? 1);
      Vout_ideal = Av * (p.Vin ?? 0);
      Zin = Infinity;
      expr = `Vout = (1 + Rf/Rg)·Vin = ${Av.toFixed(2)}·Vin`;
      break;
    }
    case 'follower': {
      Av = 1;
      Vout_ideal = p.Vin ?? 0;
      Zin = Infinity;
      expr = `Vout = Vin`;
      break;
    }
    case 'summing': {
      if ((p.R1 ?? 0) === 0 || (p.R2 ?? 0) === 0) throw new Error('R1, R2 must be > 0');
      Av = NaN; // no single Av for multi-input
      Vout_ideal = -(p.Rf ?? 0) * ((p.V1 ?? 0) / (p.R1 ?? 1) + (p.V2 ?? 0) / (p.R2 ?? 1));
      Zin = p.R1 ?? 0; // per-input; report R1 as the representative Zin
      expr = `Vout = -Rf·(V1/R1 + V2/R2) = ${Vout_ideal.toFixed(3)}`;
      break;
    }
    case 'difference': {
      if ((p.R1 ?? 0) === 0) throw new Error('R1 must be > 0');
      Av = (p.R2 ?? 0) / (p.R1 ?? 1);
      Vout_ideal = Av * ((p.V2 ?? 0) - (p.V1 ?? 0));
      Zin = 2 * (p.R1 ?? 0);
      expr = `Vout = (R2/R1)·(V2 - V1) = ${Av.toFixed(2)}·(V2-V1)`;
      break;
    }
  }

  const Vout = Math.max(-Vcc, Math.min(Vcc, Vout_ideal));
  let region: OpampResult['region'];
  if (Vout_ideal > Vcc - EPS) region = 'saturated (+)';
  else if (Vout_ideal < -Vcc + EPS) region = 'saturated (-)';
  else region = 'linear';

  return { Av, Vout, Zin_kOhm: Zin, region, transferExpr: expr };
}
