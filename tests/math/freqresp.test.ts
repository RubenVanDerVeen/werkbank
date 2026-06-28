import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../../src/math/freqresp.ts';

const P = {
  gm_mS: 40, Rsig_kOhm: 0.6, Rin_kOhm: 2.5, RC_kOhm: 5, RL_kOhm: 10,
  Cpi_pF: 10, Cmu_pF: 2, C1_uF: 1, C2_uF: 1,
};

test('midband gain ≈ -133.3', () => {
  assert.ok(Math.abs(analyze(P).Amid - -133.3) < 0.5, `Amid=${analyze(P).Amid}`);
});
test('AmidDb ≈ 42.5', () => {
  assert.ok(Math.abs(analyze(P).AmidDb - 42.5) < 0.2, `dB=${analyze(P).AmidDb}`);
});
test('fH ≈ 1.18 MHz', () => {
  const fH = analyze(P).fH_Hz;
  assert.ok(Math.abs(fH - 1.18e6) / 1.18e6 < 0.02, `fH=${fH}`);
});
test('fL ≈ 51.3 Hz (input coupling dominates)', () => {
  const fL = analyze(P).fL_Hz;
  assert.ok(Math.abs(fL - 51.3) / 51.3 < 0.02, `fL=${fL}`);
});
