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
  if (!(D > 0 && D <= 1)) throw new Error('D out of range; check turnsRatio');
  const ILp = (inp.Iout * (1 + D)) / (n * (1 - D));
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
  const Dnatural = (Vout * n) / Vin;
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
