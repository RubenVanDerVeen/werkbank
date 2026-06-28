import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, type Config } from '../../src/math/opamp.ts';

test('inverting: Av=-10, Vout=-1 at Vin=0.1, linear', () => {
  const r = analyze('inverting', { R1: 10, Rf: 100, Vcc: 15, Vin: 0.1 });
  assert.equal(r.Av, -10);
  assert.ok(Math.abs(r.Vout - (-1.0)) < 1e-9, `Vout=${r.Vout}`);
  assert.equal(r.region, 'linear');
});

test('inverting: saturates at -Vcc when overdriven', () => {
  const r = analyze('inverting', { R1: 10, Rf: 100, Vcc: 15, Vin: 2.0 });
  assert.ok(Math.abs(r.Vout - (-15)) < 1e-9, `Vout=${r.Vout}`);
  assert.equal(r.region, 'saturated (-)');
});

test('non-inverting: Av = 1 + Rf/Rg = 10', () => {
  const r = analyze('non-inverting', { Rg: 1, Rf: 9, Vcc: 15, Vin: 0.1 });
  assert.equal(r.Av, 10);
  assert.ok(Math.abs(r.Vout - 1.0) < 1e-9, `Vout=${r.Vout}`);
});

test('follower: Av=1, Vout=Vin', () => {
  const r = analyze('follower', { Vcc: 15, Vin: 5 });
  assert.equal(r.Av, 1);
  assert.ok(Math.abs(r.Vout - 5) < 1e-9, `Vout=${r.Vout}`);
});

test('summing: Vout = -Rf·(V1/R1 + V2/R2), saturates at -Vcc', () => {
  const r = analyze('summing', { R1: 10, R2: 10, Rf: 100, Vcc: 15, V1: 1, V2: 0.5 });
  // Ideal = -100·(0.1 + 0.05) = -15 → saturated
  assert.equal(r.region, 'saturated (-)');
  assert.ok(Math.abs(r.Vout - (-15)) < 1e-9, `Vout=${r.Vout}`);
});

test('difference: Vout = (R2/R1)·(V2-V1) = +1.0', () => {
  const r = analyze('difference', { R1: 10, R2: 100, Vcc: 15, V1: 0.1, V2: 0.2 });
  assert.equal(r.Av, 10);
  assert.ok(Math.abs(r.Vout - 1.0) < 1e-9, `Vout=${r.Vout}`);
  assert.equal(r.region, 'linear');
});
