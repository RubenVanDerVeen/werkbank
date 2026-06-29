export interface SmpsInputs {
  Vin: number;
  Vout: number;
  Iout: number;
  fsw: number;
  L: number;
  C: number;
  rdsOn: number;
  vf: number;
}

export interface ConverterDesign {
  D: number;
  deltaIL: number;
  deltaVout: number;
  iLpeak: number;
  iLrms: number;
  iSwitchPeak: number;
  iSwitchRms: number;
  iDiodeAvg: number;
  efficiency: number;
}

function conductionLosses(d: { iSwitchRms: number; iDiodeAvg: number; rdsOn: number; vf: number }): number {
  return d.iSwitchRms ** 2 * d.rdsOn + d.iDiodeAvg * d.vf;
}

export function designBuck(inp: SmpsInputs): ConverterDesign {
  if (!(inp.Vin > 0 && inp.Vout > 0 && inp.Iout > 0 && inp.fsw > 0 && inp.L > 0 && inp.C > 0 && inp.rdsOn >= 0 && inp.vf >= 0)) {
    throw new Error('invalid input');
  }
  if (inp.Vout >= inp.Vin) throw new Error('buck requires Vout<Vin');
  const D = inp.Vout / inp.Vin;
  const deltaIL = (inp.Vin - inp.Vout) * D / (inp.L * inp.fsw);
  const deltaVout = deltaIL / (8 * inp.fsw * inp.C);
  const IL = inp.Iout;
  const iLpeak = IL + deltaIL / 2;
  const iLrms = Math.sqrt(IL * IL + (deltaIL * deltaIL) / 12);
  const iSwitchPeak = iLpeak;
  const iSwitchRms = iLrms * Math.sqrt(D);
  const iDiodeAvg = IL * (1 - D);
  const eta = 1 - conductionLosses({ iSwitchRms, iDiodeAvg, rdsOn: inp.rdsOn, vf: inp.vf }) / (inp.Vout * inp.Iout);
  return { D, deltaIL, deltaVout, iLpeak, iLrms, iSwitchPeak, iSwitchRms, iDiodeAvg, efficiency: Math.max(0, Math.min(1, eta)) };
}

export function designBoost(inp: SmpsInputs): ConverterDesign {
  if (!(inp.Vin > 0 && inp.Vout > 0 && inp.Iout > 0 && inp.Vout > inp.Vin && inp.fsw > 0 && inp.L > 0 && inp.C > 0 && inp.rdsOn >= 0 && inp.vf >= 0)) {
    throw new Error('invalid input');
  }
  const D = 1 - inp.Vin / inp.Vout;
  const deltaIL = inp.Vin * D / (inp.L * inp.fsw);
  const deltaVout = inp.Iout * D / (inp.C * inp.fsw);
  const IL = inp.Iout / (1 - D);
  const iLpeak = IL + deltaIL / 2;
  const iLrms = Math.sqrt(IL * IL + (deltaIL * deltaIL) / 12);
  const iSwitchPeak = iLpeak;
  const iSwitchRms = iLrms * Math.sqrt(D);
  const iDiodeAvg = inp.Iout;
  const eta = 1 - conductionLosses({ iSwitchRms, iDiodeAvg, rdsOn: inp.rdsOn, vf: inp.vf }) / (inp.Vout * inp.Iout);
  return { D, deltaIL, deltaVout, iLpeak, iLrms, iSwitchPeak, iSwitchRms, iDiodeAvg, efficiency: Math.max(0, Math.min(1, eta)) };
}

export function designBuckBoost(inp: SmpsInputs): ConverterDesign {
  const Vin = inp.Vin, Vout = inp.Vout;
  if (!(Vin > 0 && Vout > 0 && inp.Iout > 0 && inp.fsw > 0 && inp.L > 0 && inp.C > 0 && inp.rdsOn >= 0 && inp.vf >= 0)) throw new Error('invalid input');
  const D = Vout / (Vout + Vin);
  const IL = inp.Iout * (Vin + Vout) / Vin;
  const deltaIL = Vin * D / (inp.L * inp.fsw);
  const deltaVout = inp.Iout * D / (inp.C * inp.fsw);
  const iLpeak = IL + deltaIL / 2;
  const iLrms = Math.sqrt(IL * IL + (deltaIL * deltaIL) / 12);
  const iSwitchPeak = iLpeak;
  const iSwitchRms = iLrms * Math.sqrt(D);
  const iDiodeAvg = IL * (1 - D);
  const eta = 1 - conductionLosses({ iSwitchRms, iDiodeAvg, rdsOn: inp.rdsOn, vf: inp.vf }) / (Vout * inp.Iout);
  return { D, deltaIL, deltaVout, iLpeak, iLrms, iSwitchPeak, iSwitchRms, iDiodeAvg, efficiency: Math.max(0, Math.min(1, eta)) };
}

export interface IsolatedInputs extends SmpsInputs { turnsRatio: number; }

export function designFlyback(inp: IsolatedInputs): ConverterDesign {
  const { Vin, Vout } = inp;
  if (!(Vin > 0 && Vout > 0 && inp.Iout > 0 && inp.fsw > 0 && inp.L > 0 && inp.C > 0 && inp.turnsRatio > 0 && inp.rdsOn >= 0 && inp.vf >= 0)) throw new Error('invalid input');
  const n = inp.turnsRatio;
  const D = Vout / (Vin * n);
  if (!(D > 0 && D < 1)) throw new Error('D out of range; check turnsRatio');
  const ILp = (inp.Vout * inp.Iout) / (Vin * D);
  const deltaIL = Vin * D / (inp.L * inp.fsw);
  const iSwitchPeak = ILp + deltaIL / 2;
  const iLrms = Math.sqrt(ILp * ILp + (deltaIL * deltaIL) / 12);
  const iDiodeAvg = inp.Iout;
  const iSwitchRms = iLrms * Math.sqrt(D);
  const deltaVout = inp.Iout * D / (inp.C * inp.fsw);
  const eta = 1 - conductionLosses({ iSwitchRms, iDiodeAvg, rdsOn: inp.rdsOn, vf: inp.vf }) / (Vout * inp.Iout);
  return { D, deltaIL, deltaVout, iLpeak: iSwitchPeak, iLrms, iSwitchPeak, iSwitchRms, iDiodeAvg, efficiency: Math.max(0, Math.min(1, eta)) };
}

export function designForward(inp: IsolatedInputs): ConverterDesign {
  const { Vin, Vout } = inp;
  if (!(Vin > 0 && Vout > 0 && inp.Iout > 0 && inp.fsw > 0 && inp.L > 0 && inp.C > 0 && inp.turnsRatio > 0 && inp.rdsOn >= 0 && inp.vf >= 0)) throw new Error('invalid input');
  const n = inp.turnsRatio;
  const Dnatural = Vout / (n * Vin);
  const D = Dnatural > 0.5 ? 0.45 : Dnatural;
  const IL = inp.Iout;
  const deltaIL = (Vin - Vout / n) * D / (inp.L * inp.fsw);
  const iLpeak = IL + deltaIL / 2;
  const iLrms = Math.sqrt(IL * IL + (deltaIL * deltaIL) / 12);
  const iSwitchPeak = iLpeak;
  const iSwitchRms = iLrms * Math.sqrt(D);
  const iDiodeAvg = IL;
  const deltaVout = deltaIL / (8 * inp.fsw * inp.C);
  const eta = 1 - conductionLosses({ iSwitchRms, iDiodeAvg, rdsOn: inp.rdsOn, vf: inp.vf }) / (Vout * inp.Iout);
  return { D, deltaIL, deltaVout, iLpeak, iLrms, iSwitchPeak, iSwitchRms, iDiodeAvg, efficiency: Math.max(0, Math.min(1, eta)) };
}

export type Topology = 'buck' | 'boost' | 'buckboost' | 'flyback' | 'forward';

export function waveform(top: Topology, inp: SmpsInputs, n = 128): { t: number; vSwitch: number; iL: number }[] {
  const T = 1 / inp.fsw;
  const d = top === 'buck' ? designBuck(inp) : top === 'boost' ? designBoost(inp)
           : top === 'buckboost' ? designBuckBoost(inp) : top === 'flyback' ? designFlyback(inp as IsolatedInputs)
           : designForward(inp as IsolatedInputs);
  const IL = (top === 'flyback') ? inp.Iout / inp.turnsRatio : (top === 'boost' || top === 'buckboost') ? inp.Iout / (1 - d.D) : inp.Iout;
  const { D } = d;
  const out: { t: number; vSwitch: number; iL: number }[] = [];
  for (let k = 0; k < n; k++) {
    const t = (k / (n - 1)) * T;
    const on = t < D * T;
    const fracOn = on ? t / (D * T) : (t - D * T) / ((1 - D) * T);
    let vSwitch: number;
    if (top === 'buck') vSwitch = on ? inp.Vin : 0;
    else if (top === 'boost') vSwitch = on ? 0 : inp.Vout + inp.vf;
    else if (top === 'buckboost') vSwitch = on ? inp.Vin : 0;
    else vSwitch = on ? inp.Vin : 0;
    const iL = on ? IL - d.deltaIL / 2 + d.deltaIL * fracOn : IL + d.deltaIL / 2 - d.deltaIL * fracOn;
    out.push({ t, vSwitch, iL });
  }
  return out;
}
