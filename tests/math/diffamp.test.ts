import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../../src/math/diffamp.ts';

const P = { Itail_mA: 2, RC_kOhm: 5, REE_kOhm: 100, beta: 200, VT_V: 0.025 };

test('gm = 40 mS, rpi = 5k, Rid = 10k', () => {
  const r = analyze(P);
  assert.ok(Math.abs(r.gm_mS - 40) < 1e-6, `gm=${r.gm_mS}`);
  assert.ok(Math.abs(r.rpi_kOhm - 5) < 1e-6, `rpi=${r.rpi_kOhm}`);
  assert.ok(Math.abs(r.Rid_kOhm - 10) < 1e-6, `Rid=${r.Rid_kOhm}`);
});
test('Ad = 100', () => { assert.ok(Math.abs(analyze(P).Ad - 100) < 1e-6); });
test('CMRR = 4000, CMRR_dB ≈ 72.0', () => {
  const r = analyze(P);
  assert.ok(Math.abs(r.CMRR - 4000) < 1e-3, `CMRR=${r.CMRR}`);
  assert.ok(Math.abs(r.CMRRdb - 72.04) < 0.05, `dB=${r.CMRRdb}`);
});