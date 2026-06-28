export type PaClass = 'A' | 'B' | 'AB';
export interface PaParams { Vcc: number; Vp: number; RL: number; Icq: number; }
export interface PaResult { Pout_W: number; Pdc_W: number; eta: number; etaMax: number; Pdiss_W: number; }

export function analyze(cls: PaClass, p: PaParams): PaResult {
  const Pout = (p.Vp * p.Vp) / (2 * p.RL);
  let Pdc: number, etaMax: number;
  if (cls === 'A') { Pdc = p.Vcc * p.Icq; etaMax = 0.25; }
  else if (cls === 'B') { Pdc = (2 * p.Vcc * p.Vp) / (Math.PI * p.RL); etaMax = Math.PI / 4; }
  else { Pdc = (2 * p.Vcc * p.Vp) / (Math.PI * p.RL) + p.Vcc * p.Icq; etaMax = Math.PI / 4; }
  const eta = Pdc > 0 ? Pout / Pdc : 0;
  return { Pout_W: Pout, Pdc_W: Pdc, eta, etaMax, Pdiss_W: Pdc - Pout };
}

export function transfer(cls: PaClass, opt: { Vcc: number; Vbe: number }, vin: number): number {
  const clip = (v: number) => Math.max(-opt.Vcc, Math.min(opt.Vcc, v));
  if (cls === 'A') return clip(vin);
  const dead = cls === 'B' ? opt.Vbe : opt.Vbe * 0.1;
  if (Math.abs(vin) <= dead) return 0;
  return clip(vin - Math.sign(vin) * dead);
}