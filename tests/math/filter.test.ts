import { test } from 'node:test';
import assert from 'node:assert/strict';
import { design } from '../../src/math/filter.ts';
import { bode } from '../../src/math/bode.ts';

test('LP R=10k C=10nF → f0 ≈ 1592 Hz, Q = 0.5', () => {
  const d = design('LP', 10, 10, 10, 10);
  assert.ok(Math.abs(d.f0_Hz - 1591.5) / 1591.5 < 0.01, `f0=${d.f0_Hz}`);
  assert.ok(Math.abs(d.Q - 0.5) < 1e-3, `Q=${d.Q}`);
});
test('LP magnitude at f0 ≈ -6.0 dB (Q=0.5)', () => {
  const d = design('LP', 10, 10, 10, 10);
  const w0 = 2 * Math.PI * d.f0_Hz;
  const m = bode(d.tf, [{ omega: w0 }])[0]!.magDb;
  assert.ok(Math.abs(m - 20 * Math.log10(0.5)) < 0.1, `mag=${m}`);
});
test('HP R=10k C=10nF → f0 ≈ 1592 Hz', () => {
  assert.ok(Math.abs(design('HP', 10, 10, 10, 10).f0_Hz - 1591.5) / 1591.5 < 0.01);
});