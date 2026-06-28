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
