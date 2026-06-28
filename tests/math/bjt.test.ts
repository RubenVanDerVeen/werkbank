import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hybridPi } from '../../src/math/bjt.ts';

test('hybridPi at IC=1mA, VT=25mV, beta=100', () => {
  const r = hybridPi(100, 1, 25);
  assert.ok(Math.abs(r.gm_mS - 40) < 0.01, `gm=${r.gm_mS}`);
  assert.ok(Math.abs(r.rpi_kOhm - 2.5) < 0.01, `rpi=${r.rpi_kOhm}`);
});
