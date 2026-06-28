export type Topology = 'series-shunt' | 'shunt-series' | 'series-series' | 'shunt-shunt';
export interface FbResult {
  T: number; D: number; Af: number; AfDb: number;
  Zin_f: number; Zout_f: number; zinDir: '×' | '÷'; zoutDir: '×' | '÷';
}

// [seriesMixing → Zin×D, shuntSampling → Zout÷D]
const RULES: Record<Topology, { zinMul: boolean; zoutMul: boolean }> = {
  'series-shunt':  { zinMul: true,  zoutMul: false }, // Zin×D, Zout÷D
  'shunt-series':  { zinMul: false, zoutMul: true  }, // Zin÷D, Zout×D
  'series-series': { zinMul: true,  zoutMul: true  }, // Zin×D, Zout×D
  'shunt-shunt':   { zinMul: false, zoutMul: false }, // Zin÷D, Zout÷D
};

export function analyze(topology: Topology, A: number, beta: number, Zin: number, Zout: number): FbResult {
  const T = A * beta;
  const D = 1 + T;
  if (D === 0) throw new Error('1+Aβ = 0 (oscillation)');
  const Af = A / D;
  const { zinMul, zoutMul } = RULES[topology];
  return {
    T, D, Af, AfDb: 20 * Math.log10(Math.abs(Af)),
    Zin_f: zinMul ? Zin * D : Zin / D,
    Zout_f: zoutMul ? Zout * D : Zout / D,
    zinDir: zinMul ? '×' : '÷',
    zoutDir: zoutMul ? '×' : '÷',
  };
}