import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hybridPi } from '../../src/math/bjt.ts';

test('hybridPi at IC=1mA, VT=25mV, beta=100', () => {
  const r = hybridPi(100, 1, 25);
  assert.ok(Math.abs(r.gm_mS - 40) < 0.01, `gm=${r.gm_mS}`);
  assert.ok(Math.abs(r.rpi_kOhm - 2.5) < 0.01, `rpi=${r.rpi_kOhm}`);
});

import { analyze } from '../../src/math/bjt.ts';

test('CE bypassed: Av ≈ -133.3, Zin_device ≈ 2.5k', () => {
  const r = analyze('CE', {
    beta: 100, ICmA: 1, VTmV: 25,
    RC_kOhm: 5, RE_kOhm: 0, RL_kOhm: 10, Rs_kOhm: 0, RB_kOhm: Infinity, REbypassed: true,
  });
  assert.ok(Math.abs(r.Av - (-133.333)) < 0.5, `Av=${r.Av}`);
  assert.ok(Math.abs(r.Zin_device_kOhm - 2.5) < 0.1, `Zin=${r.Zin_device_kOhm}`);
});

test('CE unbypassed RE=500Ω: Av ≈ -6.29, Zin_device ≈ 53k', () => {
  const r = analyze('CE', {
    beta: 100, ICmA: 1, VTmV: 25,
    RC_kOhm: 5, RE_kOhm: 0.5, RL_kOhm: 10, Rs_kOhm: 0, RB_kOhm: Infinity, REbypassed: false,
  });
  assert.ok(Math.abs(r.Av - (-6.289)) < 0.1, `Av=${r.Av}`);
  assert.ok(Math.abs(r.Zin_device_kOhm - 53) < 1, `Zin=${r.Zin_device_kOhm}`);
});
