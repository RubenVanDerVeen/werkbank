import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, type Stage } from '../../src/math/multistage.ts';

const stages: Stage[] = [
  { Av0: -10, Rin_kOhm: 2, Rout_kOhm: 5, fH_Hz: 1e6 },
  { Av0: -10, Rin_kOhm: 2, Rout_kOhm: 5, fH_Hz: 1e6 },
];

test('two identical stages: loaded stage gain ≈ -2.857', () => {
  const r = analyze(stages, 2);
  assert.ok(Math.abs(r.stageGains[0]! - -2.857) < 0.01, `g0=${r.stageGains[0]}`);
});
test('overall gain ≈ 8.16', () => {
  assert.ok(Math.abs(analyze(stages, 2).AvTotal - 8.163) < 0.01);
});
test('overall BW ≈ 707 kHz', () => {
  const bw = analyze(stages, 2).BW_Hz;
  assert.ok(Math.abs(bw - 7.071e5) / 7.071e5 < 0.01, `BW=${bw}`);
});