export interface DiffParams { Itail_mA: number; RC_kOhm: number; REE_kOhm: number; beta: number; VT_V: number; }
export interface DiffResult {
  gm_mS: number; rpi_kOhm: number; Ad: number; Acm: number; CMRR: number; CMRRdb: number; Rid_kOhm: number;
}

export function analyze(p: DiffParams): DiffResult {
  const IC = p.Itail_mA / 2;
  const gm = IC / p.VT_V;
  const rpi = p.beta / gm;
  const Ad = (gm * p.RC_kOhm) / 2;
  const Acm = p.RC_kOhm / (2 * p.REE_kOhm);
  const CMRR = Ad / Acm;
  return {
    gm_mS: gm, rpi_kOhm: rpi, Ad, Acm, CMRR,
    CMRRdb: 20 * Math.log10(CMRR), Rid_kOhm: 2 * rpi,
  };
}