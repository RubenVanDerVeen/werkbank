import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gmMOSFET, gmJFET, analyze } from '../../src/math/fet.ts';

test('gmMOSFET: Kn=1, IDQ=2mA → gm = 2.83 mS', () => {
  assert.ok(Math.abs(gmMOSFET(1, 2) - 2.83) < 0.01, `gm=${gmMOSFET(1, 2)}`);
});

test('gmJFET: IDSS=10, Vp=-4, IDQ=2mA → gm ≈ 2.24 mS', () => {
  assert.ok(Math.abs(gmJFET(10, -4, 2) - 2.24) < 0.02, `gm=${gmJFET(10, -4, 2)}`);
});

test('MOSFET CS bypassed: Av ≈ -9.43', () => {
  const r = analyze('MOSFET', 'CS', {
    IDQ_mA: 2, Kn_mAV2: 1, RD_kOhm: 5, RS_kOhm: 0, RL_kOhm: 10,
    Rs_kOhm: 0, RG_MOhm: 1, RSbypassed: true,
  });
  assert.ok(Math.abs(r.Av - (-9.43)) < 0.1, `Av=${r.Av}`);
  assert.ok(Math.abs(r.Zin_MOhm - 1) < 0.001, `Zin=${r.Zin_MOhm}`);
});

test('MOSFET CS unbypassed RS=1k: Av ≈ -2.43', () => {
  const r = analyze('MOSFET', 'CS', {
    IDQ_mA: 2, Kn_mAV2: 1, RD_kOhm: 5, RS_kOhm: 1, RL_kOhm: 10,
    Rs_kOhm: 0, RG_MOhm: 1, RSbypassed: false,
  });
  assert.ok(Math.abs(r.Av - (-2.43)) < 0.1, `Av=${r.Av}`);
});

test('MOSFET CD: Av ≈ 0.825, Zout ≈ 0.300k', () => {
  const r = analyze('MOSFET', 'CD', {
    IDQ_mA: 2, Kn_mAV2: 1, RD_kOhm: 0, RS_kOhm: 2, RL_kOhm: 10,
    Rs_kOhm: 0, RG_MOhm: 1, RSbypassed: false,
  });
  assert.ok(Math.abs(r.Av - 0.825) < 0.01, `Av=${r.Av}`);
  assert.ok(Math.abs(r.Zout_kOhm - 0.300) < 0.02, `Zout=${r.Zout_kOhm}`);
});

test('MOSFET CG: Av ≈ +9.43, Zin ≈ 0.354k', () => {
  const r = analyze('MOSFET', 'CG', {
    IDQ_mA: 2, Kn_mAV2: 1, RD_kOhm: 5, RS_kOhm: 1, RL_kOhm: 10,
    Rs_kOhm: 0, RG_MOhm: 1, RSbypassed: false,
  });
  assert.ok(Math.abs(r.Av - 9.43) < 0.1, `Av=${r.Av}`);
  assert.ok(Math.abs(r.Zin_MOhm - 0.000354) < 0.00005, `Zin=${r.Zin_MOhm}`);
});

test('JFET CS bypassed: Av ≈ -7.47', () => {
  const r = analyze('JFET', 'CS', {
    IDQ_mA: 2, IDSS_mA: 10, Vp_V: -4, RD_kOhm: 5, RS_kOhm: 0, RL_kOhm: 10,
    Rs_kOhm: 0, RG_MOhm: 1, RSbypassed: true,
  });
  assert.ok(Math.abs(r.Av - (-7.47)) < 0.1, `Av=${r.Av}`);
});
