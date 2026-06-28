import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../../src/math/oscillator.ts';

test('Wien R=10k C=10nF → f0 ≈ 1591.5 Hz, AvMin=3', () => {
  const r = analyze('Wien', { R_kOhm: 10, C_nF: 10 });
  assert.ok(Math.abs(r.f0_Hz - 1591.5) / 1591.5 < 0.01, `f0=${r.f0_Hz}`);
  assert.ok(r.AvMin === 3, `AvMin=${r.AvMin}`);
});
test('Phase-shift R=10k C=10nF → f0 ≈ 649.7 Hz, AvMin=29', () => {
  const r = analyze('Phase-shift', { R_kOhm: 10, C_nF: 10 });
  assert.ok(Math.abs(r.f0_Hz - 649.7) / 649.7 < 0.01, `f0=${r.f0_Hz}`);
  assert.ok(r.AvMin === 29, `AvMin=${r.AvMin}`);
});
test('Colpitts L=1mH C1=C2=10nF → f0 ≈ 71.18 kHz', () => {
  const r = analyze('Colpitts', { L_mH: 1, C1_nF: 10, C2_nF: 10 });
  assert.ok(Math.abs(r.f0_Hz - 71176) / 71176 < 0.01, `f0=${r.f0_Hz}`);
});
test('Hartley L1=L2=1mH C=10nF → f0 ≈ 35.59 kHz', () => {
  const r = analyze('Hartley', { L1_mH: 1, L2_mH: 1, C_nF: 10 });
  assert.ok(Math.abs(r.f0_Hz - 35588) / 35588 < 0.01, `f0=${r.f0_Hz}`);
});