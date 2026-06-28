// ponytail: high-end BW only; RSS-inverse BW approx (arbitrary unequal fH)
export interface Stage { Av0: number; Rin_kOhm: number; Rout_kOhm: number; fH_Hz: number; }
export interface MultiResult { AvTotal: number; AvTotalDb: number; BW_Hz: number; stageGains: number[]; }

export function analyze(stages: Stage[], RL_kOhm: number): MultiResult {
  const stageGains: number[] = [];
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i]!;
    const load = i < stages.length - 1 ? stages[i + 1]!.Rin_kOhm : RL_kOhm;
    stageGains.push(s.Av0 * (load / (s.Rout_kOhm + load)));
  }
  const AvTotal = stageGains.reduce((a, b) => a * b, 1);
  const invSq = stages.reduce((a, s) => a + 1 / (s.fH_Hz * s.fH_Hz), 0);
  const BW_Hz = 1 / Math.sqrt(invSq);
  return { AvTotal, AvTotalDb: 20 * Math.log10(Math.abs(AvTotal)), BW_Hz, stageGains };
}