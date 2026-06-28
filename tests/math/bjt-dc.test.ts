import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bias, type Network } from '../../src/math/bjt-dc.ts';

test('fixed-bias: IC ≈ 2.39mA, VCE ≈ 2.43V, active', () => {
  const r = bias('fixed', {
    VCC: 12, beta: 100, VBEon: 0.7, VCEsat: 0.2,
    RB: 470, RC: 4,
  });
  assert.ok(Math.abs(r.ICmA - 2.39) < 0.05, `IC=${r.ICmA}`);
  assert.ok(Math.abs(r.VCE - 2.43) < 0.05, `VCE=${r.VCE}`);
  assert.equal(r.region, 'active');
});

test('voltage-divider: IC ≈ 1.68mA, VCE ≈ 3.57V, active', () => {
  const r = bias('divider', {
    VCC: 12, beta: 100, VBEon: 0.7, VCEsat: 0.2,
    R1: 120, R2: 30, RC: 4, RE: 1,
  });
  assert.ok(Math.abs(r.ICmA - 1.68) < 0.05, `IC=${r.ICmA}`);
  assert.ok(Math.abs(r.VCE - 3.57) < 0.1, `VCE=${r.VCE}`);
  assert.equal(r.region, 'active');
});
