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

test('emitter-feedback: stable active region', () => {
  const r = bias('emitter-feedback', {
    VCC: 12, beta: 100, VBEon: 0.7, VCEsat: 0.2,
    RB: 470, RC: 4, RE: 1,
  });
  assert.equal(r.region, 'active');
  assert.ok(r.ICmA > 0.5 && r.ICmA < 3, `IC=${r.ICmA}`);
  assert.ok(r.VCE > 0.5 && r.VCE < 11, `VCE=${r.VCE}`);
});

test('fixed-bias at beta=300 saturates', () => {
  const r = bias('fixed', {
    VCC: 12, beta: 300, VBEon: 0.7, VCEsat: 0.2,
    RB: 470, RC: 4,
  });
  assert.equal(r.region, 'saturation');
});

test('fixed-bias under-driven (huge RB) is cutoff', () => {
  const r = bias('fixed', {
    VCC: 12, beta: 100, VBEon: 0.7, VCEsat: 0.2,
    RB: 2_000_000, RC: 4,
  });
  assert.equal(r.region, 'cutoff');
});

test('load-line endpoints: iMax = VCC/(RC+RE), vMax = VCC', () => {
  const r = bias('divider', {
    VCC: 12, beta: 100, VBEon: 0.7, VCEsat: 0.2,
    R1: 120, R2: 30, RC: 4, RE: 1,
  });
  assert.ok(Math.abs(r.loadLine.iMax_mA - 2.4) < 0.01, `iMax=${r.loadLine.iMax_mA}`);
  assert.equal(r.loadLine.vMax, 12);
});
