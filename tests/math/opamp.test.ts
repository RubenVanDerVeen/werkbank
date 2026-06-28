import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, transfer, type Config } from '../../src/math/opamp.ts';

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

test('transfer: difference sweeps V1 with V2 fixed (not a flat line)', () => {
  // Vout = (R2/R1)·(V2 - V1) = -(V1) with R1=R2, V2=0 → slope -1.
  const ys = transfer('difference', { R1: 10, R2: 10, Vcc: 15, V2: 0 }, [-1, 0, 1]);
  assert.ok(Math.abs(ys[0]! - 1) < 1e-9, `ys0=${ys[0]}`);
  assert.ok(Math.abs(ys[1]! - 0) < 1e-9, `ys1=${ys[1]}`);
  assert.ok(Math.abs(ys[2]! - (-1)) < 1e-9, `ys2=${ys[2]}`);
});

test('transfer: summing sweeps V1 with V2 fixed (not a flat line)', () => {
  // Vout = -Rf·(V1/R1 + V2/R2) = -(V1) with Rf=R1, V2=0 → slope -1.
  const ys = transfer('summing', { R1: 10, R2: 10, Rf: 10, Vcc: 15, V2: 0 }, [-1, 0, 1]);
  assert.ok(Math.abs(ys[0]! - 1) < 1e-9, `ys0=${ys[0]}`);
  assert.ok(Math.abs(ys[1]! - 0) < 1e-9, `ys1=${ys[1]}`);
  assert.ok(Math.abs(ys[2]! - (-1)) < 1e-9, `ys2=${ys[2]}`);
});

test('transfer: inverting sweep shows linear region and two saturation plateaus', () => {
  const xs = [-3, -1.5, 0, 1.5, 3];
  const ys = transfer('inverting', { R1: 10, Rf: 100, Vcc: 15 }, xs);
  // Av = -10: Vin=-3 → +30 → +15 (sat +); Vin=-1.5 → +15 (rail); Vin=0 → 0; Vin=1.5 → -15 (rail); Vin=3 → -30 → -15 (sat -)
  assert.ok(Math.abs(ys[0]! - 15) < 1e-9);    // Vin=-3 → saturated (+)
  assert.ok(Math.abs(ys[1]! - 15) < 1e-9);    // Vin=-1.5 → +15 (rail)
  assert.ok(Math.abs(ys[2]! - 0) < 1e-9);     // Vin=0 → 0
  assert.ok(Math.abs(ys[3]! - (-15)) < 1e-9); // Vin=1.5 → -15 (rail)
  assert.ok(Math.abs(ys[4]! - (-15)) < 1e-9); // Vin=3 → saturated (-)
});
