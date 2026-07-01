import { test } from 'node:test';
import assert from 'node:assert/strict';
import { friis, eirp, fspl, friisDbm, radarEq, fadeMargin, lambdaOf, C } from '../../src/math/linkbudget.ts';

test('eirp: Pt*Gt linear', () => {
  assert.ok(Math.abs(eirp(1, 100) - 100) < 1e-9, `eirp=${eirp(1, 100)}`);
});

test('fspl: 1 km @ 2.4 GHz ~= 100 dB', () => {
  const L = fspl(1000, 2.4e9);
  assert.ok(Math.abs(L - 100) < 0.1, `fspl=${L}`);
});

test('fspl: algebraic identity 20*log10(4*pi*R*f/C)', () => {
  const L = fspl(1000, 2.4e9);
  const ref = 20 * Math.log10((4 * Math.PI * 1000 * 2.4e9) / C);
  assert.ok(Math.abs(L - ref) < 1e-9, `L=${L} ref=${ref}`);
});

test('friisDbm: 0 dBm, 0 dBi, 0 dBi, 1 km, 2.4 GHz ~= -100 dBm', () => {
  const pr = friisDbm(0, 0, 0, 1000, 2.4e9);
  assert.ok(Math.abs(pr - (-100)) < 0.1, `pr=${pr}`);
});

test('friis (W) cross-checks friisDbm (dBm)', () => {
  const f = 2.4e9;
  const lam = lambdaOf(f);
  const prW = friis(1e-3, 1, 1, lam, 1000); // Pt=1mW, Gt=Gr=1 (0 dBi)
  const prDbm = 10 * Math.log10(prW / 1e-3);
  assert.ok(Math.abs(prDbm - friisDbm(0, 0, 0, 1000, f)) < 1e-6,
    `W->dBm=${prDbm} dB=${friisDbm(0, 0, 0, 1000, f)}`);
});

test('radarEq: 1 kW, G=1000 (30 dB), sigma=1 m^2, 10 GHz, 10 km', () => {
  const pr = radarEq(1000, 1000, 1, 0.03, 10000);
  assert.ok(Math.abs(pr - 4.5354e-14) < 1e-15, `pr=${pr}`);
});

test('fadeMargin: above and below sensitivity', () => {
  assert.ok(Math.abs(fadeMargin(-80, -100) - 20) < 1e-9);
  assert.ok(Math.abs(fadeMargin(-110, -100) - (-10)) < 1e-9);
});