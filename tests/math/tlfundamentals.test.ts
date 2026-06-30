import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  characteristicImpedance,
  propagationConstant,
  phaseVelocity,
  isDistortionless,
  losslessZ0,
} from '../../src/math/tlfundamentals.ts';

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;
const nearC = (z: { re: number; im: number }, re: number, im: number, eps = 1e-9) =>
  near(z.re, re, eps) && near(z.im, im, eps);

test('losslessZ0(250e-9, 100e-12) = 50', () => {
  assert.ok(near(losslessZ0(250e-9, 100e-12), 50), `Z0=${losslessZ0(250e-9, 100e-12)}`);
});

test('characteristicImpedance lossless -> 50 real', () => {
  const z = characteristicImpedance(0, 250e-9, 0, 100e-12, 1e9);
  assert.ok(nearC(z, 50, 0), JSON.stringify(z));
});

test('phaseVelocity(250e-9, 100e-12) = 2e8', () => {
  assert.ok(near(phaseVelocity(250e-9, 100e-12), 2e8), `v=${phaseVelocity(250e-9, 100e-12)}`);
});

test('propagationConstant lossless -> alpha=0, beta=5', () => {
  const r = propagationConstant(0, 250e-9, 0, 100e-12, 1e9);
  assert.ok(near(r.alpha, 0, 1e-9) && near(r.beta, 5, 1e-9), JSON.stringify(r));
});

test('isDistortionless true when R/L = G/C', () => {
  assert.equal(isDistortionless(2.5e-3, 250e-9, 1e-6, 100e-12), true);
});

test('isDistortionless false when R/L != G/C', () => {
  assert.equal(isDistortionless(1e-3, 250e-9, 1e-6, 100e-12), false);
});

test('distortionless line: Z0 real=50, alpha=sqrt(RG)=5e-5, beta=5', () => {
  const z = characteristicImpedance(2.5e-3, 250e-9, 1e-6, 100e-12, 1e9);
  assert.ok(nearC(z, 50, 0, 1e-6), JSON.stringify(z));
  const r = propagationConstant(2.5e-3, 250e-9, 1e-6, 100e-12, 1e9);
  assert.ok(near(r.alpha, 5e-5, 1e-7) && near(r.beta, 5, 1e-9), JSON.stringify(r));
});

test('lossy line: Z0 = 50.01 - j*1.00 (Z0^2 = 2500 - j100)', () => {
  const z = characteristicImpedance(10, 250e-9, 0, 100e-12, 1e9);
  assert.ok(near(z.re, 50.01, 0.02) && near(z.im, -1.0, 0.02), JSON.stringify(z));
});
