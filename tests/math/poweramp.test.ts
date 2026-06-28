import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, transfer } from '../../src/math/poweramp.ts';

test('Class B Vcc=15 Vp=14 RL=8: Pout=12.25 W, η≈0.733', () => {
  const r = analyze('B', { Vcc: 15, Vp: 14, RL: 8, Icq: 0 });
  assert.ok(Math.abs(r.Pout_W - 12.25) < 1e-3, `Pout=${r.Pout_W}`);
  assert.ok(Math.abs(r.Pdc_W - 16.71) < 0.05, `Pdc=${r.Pdc_W}`);
  assert.ok(Math.abs(r.eta - 0.733) < 0.005, `eta=${r.eta}`);
  assert.ok(Math.abs(r.etaMax - 0.785) < 0.002, `etaMax=${r.etaMax}`);
});
test('Class A Vcc=15 Vp=5 RL=8 Icq=0.9375: Pout=1.5625 W, η≈0.111', () => {
  const r = analyze('A', { Vcc: 15, Vp: 5, RL: 8, Icq: 0.9375 });
  assert.ok(Math.abs(r.Pout_W - 1.5625) < 1e-3, `Pout=${r.Pout_W}`);
  assert.ok(Math.abs(r.eta - 0.1111) < 0.002, `eta=${r.eta}`);
  assert.ok(Math.abs(r.etaMax - 0.25) < 1e-9, `etaMax=${r.etaMax}`);
});
test('Class B transfer: deadzone at vin=0.5, conducting at vin=5', () => {
  assert.ok(transfer('B', { Vcc: 15, Vbe: 0.7 }, 0.5) === 0, 'deadzone');
  assert.ok(transfer('B', { Vcc: 15, Vbe: 0.7 }, 5) > 0, 'conducting');
});