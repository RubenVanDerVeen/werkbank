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

test('CC: Av ≈ 0.963, Zout ≈ 0.0335k', () => {
  const r = analyze('CC', {
    beta: 100, ICmA: 1, VTmV: 25,
    RC_kOhm: 0, RE_kOhm: 1, RL_kOhm: 10, Rs_kOhm: 1, RB_kOhm: Infinity, REbypassed: false,
  });
  assert.ok(Math.abs(r.Av - 0.963) < 0.005, `Av=${r.Av}`);
  assert.ok(Math.abs(r.Zout_kOhm - 0.0335) < 0.005, `Zout=${r.Zout_kOhm}`);
});

test('CB: Av ≈ +133.3, Zin_device ≈ 0.0236k', () => {
  const r = analyze('CB', {
    beta: 100, ICmA: 1, VTmV: 25,
    RC_kOhm: 5, RE_kOhm: 0.5, RL_kOhm: 10, Rs_kOhm: 0, RB_kOhm: Infinity, REbypassed: false,
  });
  assert.ok(Math.abs(r.Av - 133.333) < 1, `Av=${r.Av}`);
  assert.ok(Math.abs(r.Zin_device_kOhm - 0.0236) < 0.005, `Zin=${r.Zin_device_kOhm}`);
});

test('Ai is finite at RL=0 (no NaN from /0)', () => {
  for (const cfg of ['CE', 'CB', 'CC'] as const) {
    const r = analyze(cfg, {
      beta: 100, ICmA: 1, VTmV: 25,
      RC_kOhm: 5, RE_kOhm: 0.5, RL_kOhm: 0, Rs_kOhm: 1, RB_kOhm: Infinity, REbypassed: true,
    });
    assert.ok(Number.isFinite(r.Ai), `${cfg}: Ai=${r.Ai}`);
  }
});
