import { test } from 'node:test';
import assert from 'node:assert/strict';
import { designBuck, designBoost, type SmpsInputs } from '../../src/math/converter.ts';

const base: SmpsInputs = { Vin: 24, Vout: 12, Iout: 2, fsw: 100e3, L: 47e-6, C: 22e-6, rdsOn: 0.05, vf: 0.7 };

test('buck: D = Vout/Vin (CCM)', () => {
  const d = designBuck(base);
  assert.ok(Math.abs(d.D - 0.5) < 1e-9, `D=${d.D}`);
});

test('buck: deltaIL when switch closed equals (Vin-Vout)*D/(L*fsw)', () => {
  const d = designBuck(base);
  const expected = (24 - 12) * 0.5 / (47e-6 * 100e3);
  assert.ok(Math.abs(d.deltaIL - expected) / expected < 1e-9, `deltaIL=${d.deltaIL} expected=${expected}`);
});

test('buck: deltaVout equals deltaIL / (8 * fsw * C)', () => {
  const d = designBuck(base);
  const expected = d.deltaIL / (8 * 100e3 * 22e-6);
  assert.ok(Math.abs(d.deltaVout - expected) / expected < 1e-9, `deltaVout=${d.deltaVout} expected=${expected}`);
});

test('boost: D = 1 - Vin/Vout (CCM)', () => {
  const d = designBoost({ ...base, Vin: 12, Vout: 24 });
  assert.ok(Math.abs(d.D - 0.5) < 1e-9, `D=${d.D}`);
  assert.throws(() => designBuck({ ...base, Vout: 36 }), /Vout<Vin/);
});

test('boost: deltaIL = Vin*D/(L*fsw)', () => {
  const d = designBoost({ ...base, Vin: 12, Vout: 24 });
  const expected = 12 * 0.5 / (47e-6 * 100e3);
  assert.ok(Math.abs(d.deltaIL - expected) / expected < 1e-9);
});

test('efficiency accounts for conduction loss', () => {
  const d = designBuck(base);
  assert.ok(d.efficiency > 0.5 && d.efficiency < 1.0, `eta=${d.efficiency}`);
});

test('throws on Iout=0 (avoids NaN efficiency)', () => {
  assert.throws(() => designBuck({ ...base, Iout: 0 }), /invalid input/);
  assert.throws(() => designBoost({ ...base, Vin: 12, Vout: 24, Iout: 0 }), /invalid input/);
});
