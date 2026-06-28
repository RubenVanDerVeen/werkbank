export type Topology = 'series-clipper' | 'biased-shunt-clipper' | 'positive-clamper' | 'half-wave-rect' | 'peak-rect';

export interface DiodeParams {
  Vpeak: number; Vgamma: number;
  Vbias?: number; R_kOhm?: number; C_uF?: number;
}

export interface ShapeResult { vin: number[]; vout: number[] }

// ponytail: per-topology hand-coded diode logic, not a generic diode network solver
export function shape(topology: Topology, p: DiodeParams, ts: number[]): ShapeResult {
  const w = 2 * Math.PI * 50; // f=50 Hz fixed in shape (UI controls Vpeak/Vgamma)
  const vin = ts.map((t) => p.Vpeak * Math.sin(w * t));
  let vout: number[];
  switch (topology) {
    case 'series-clipper':
      vout = vin.map((v) => (v > p.Vgamma ? v : 0));
      break;
    case 'biased-shunt-clipper':
      vout = vin.map((v) => Math.min(v, (p.Vbias ?? 0) + p.Vgamma));
      break;
    case 'half-wave-rect':
      vout = vin.map((v) => Math.max(v - p.Vgamma, 0));
      break;
    case 'positive-clamper':
      vout = clamper(vin, p.Vgamma, ts);
      break;
    case 'peak-rect':
      vout = peakRect(vin, p.Vgamma, p.R_kOhm ?? 1, p.C_uF ?? 100, ts);
      break;
  }
  return { vin, vout };
}

function clamper(vin: number[], Vgamma: number, ts: number[]): number[] {
  // Charge cap to (Vpeak - Vgamma) during first negative half-cycle, then shift up.
  const offset = Math.max(...vin) - Vgamma;
  return vin.map((v, i) => v + offset * (i >= vin.length / 2 ? 1 : 0));
}

function peakRect(vin: number[], Vgamma: number, R_kOhm: number, C_uF: number, ts: number[]): number[] {
  // ponytail: sample-by-sample integration, dt = ts[i+1]-ts[i]
  const R = R_kOhm * 1000; // Ω
  const C = C_uF * 1e-6; // F
  const tau = R * C;
  let vcap = 0;
  const out: number[] = [];
  for (let i = 0; i < vin.length; i++) {
    const dt = i + 1 < vin.length ? ts[i + 1]! - ts[i]! : ts[1]! - ts[0]!;
    if (vin[i]! > vcap + Vgamma) vcap = vin[i]! - Vgamma;
    else vcap = vcap * Math.exp(-dt / tau);
    out.push(vcap);
  }
  return out;
}

export interface Metrics { Vpeak_out: number; Vavg: number; Vripple_pp: number }

export function metrics(vout: number[], _dt: number): Metrics {
  const Vpeak_out = Math.max(...vout);
  const Vavg = vout.reduce((a, b) => a + b, 0) / vout.length;
  // Ripple: peak-to-peak over the last cycle (steady state)
  const lastCycle = vout.slice(Math.floor(vout.length / 2));
  const Vripple_pp = Math.max(...lastCycle) - Math.min(...lastCycle);
  return { Vpeak_out, Vavg, Vripple_pp };
}
