import { test } from 'node:test';
import assert from 'node:assert/strict';
import { designBuck, designBoost, designBuckBoost, designFlyback, designForward, waveform, type SmpsInputs } from '../../src/math/converter.ts';

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

test('buckboost: D = |Vout|/(|Vout|+Vin) when Vout = -Vout_target', () => {
  const d = designBuckBoost({ ...base, Vin: 12, Vout: 12 });
  assert.ok(Math.abs(d.D - 12 / (12 + 12)) < 1e-9, `D=${d.D}`);
});

test('flyback: D = Vout / (Vin * n) where n=Ns/Np', () => {
  const d = designFlyback({ ...base, Vin: 30, Vout: 12, turnsRatio: 0.5 });
  assert.ok(Math.abs(d.D - 12 / (30 * 0.5)) < 1e-9, `D=${d.D}`);
});

test('forward: D = Vout*n / Vin (n=Ns/Np) and clamps to 0.45', () => {
  const d = designForward({ ...base, Vin: 24, Vout: 12, turnsRatio: 1 });
  assert.ok(Math.abs(d.D - 0.5) < 1e-9);
  const d2 = designForward({ ...base, Vin: 24, Vout: 24, turnsRatio: 1 });
  assert.ok(d2.D === 0.45, `clamp D=${d2.D}`);
});

test('waveform: buck returns N samples covering [0, T]', () => {
  const w = waveform('buck', { ...base }, 64);
  assert.equal(w.length, 64);
  assert.equal(w[0]!.t, 0);
  assert.ok(Math.abs(w[63]!.t - 1 / 100e3) < 1e-12);
});

test('waveform: buck Vswitch is Vin during on (0..DT) and 0 during off', () => {
  const w = waveform('buck', { ...base }, 100);
  const D = 0.5, T = 1 / 100e3;
  for (const p of w) {
    if (p.t < D * T) assert.ok(Math.abs(p.vSwitch - base.Vin) < 1e-6, `vSwitch at on=${p.vSwitch}`);
    else assert.ok(Math.abs(p.vSwitch) < 1e-6, `vSwitch at off=${p.vSwitch}`);
  }
});
