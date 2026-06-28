import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gmMOSFET, gmJFET } from '../../src/math/fet.ts';

test('gmMOSFET: Kn=1, IDQ=2mA → gm = 2.83 mS', () => {
  assert.ok(Math.abs(gmMOSFET(1, 2) - 2.83) < 0.01, `gm=${gmMOSFET(1, 2)}`);
});

test('gmJFET: IDSS=10, Vp=-4, IDQ=2mA → gm ≈ 2.24 mS', () => {
  assert.ok(Math.abs(gmJFET(10, -4, 2) - 2.24) < 0.02, `gm=${gmJFET(10, -4, 2)}`);
});
