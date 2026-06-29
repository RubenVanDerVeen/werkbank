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
