import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  intrinsicImpedance,
  propagationConst,
  skinDepth,
  phaseVelocity,
  poyntingAvg,
  MU0,
  EPS0,
} from '../../src/math/emwaves.ts';

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

test('intrinsicImpedance(mu0, eps0) -> 376.73 Ω', () => {
  const eta = intrinsicImpedance(MU0, EPS0);
  assert.ok(near(eta, 376.73, 0.01), `eta=${eta}`);
});

test('phaseVelocity(mu0, eps0) -> c ≈ 2.998e8', () => {
  const v = phaseVelocity(MU0, EPS0);
  assert.ok(near(v, 2.998e8, 1e5), `v=${v}`);
});

test('skinDepth(copper @ 1 GHz) -> 2.09 µm', () => {
  const d = skinDepth(2 * Math.PI * 1e9, MU0, 5.8e7);
  assert.ok(near(d, 2.09e-6, 0.01e-6), `d=${d}`);
});

test('propagationConst lossless (sigma=0) -> alpha=0, beta=omega*sqrt(mu*eps)', () => {
  const omega = 2 * Math.PI * 1e9;
  const r = propagationConst(omega, MU0, EPS0, 0);
  assert.ok(near(r.alpha, 0, 1e-6), `alpha=${r.alpha}`);
  assert.ok(near(r.beta, omega * Math.sqrt(MU0 * EPS0), 1e-3), `beta=${r.beta}`);
});

test('propagationConst good conductor (copper) -> alpha ≈ beta ≈ 1/skinDepth', () => {
  const omega = 2 * Math.PI * 1e9;
  const r = propagationConst(omega, MU0, EPS0, 5.8e7);
  const d = skinDepth(omega, MU0, 5.8e7);
  assert.ok(near(r.alpha, 1 / d, 1e3), `alpha=${r.alpha} 1/d=${1 / d}`);
  assert.ok(near(r.beta, r.alpha, 1e3), `beta=${r.beta} alpha=${r.alpha}`);
});

test('poyntingAvg(E0=100, eta=376.73) -> 13.27 W/m²', () => {
  const s = poyntingAvg(100, 376.73);
  assert.ok(near(s, 13.27, 0.01), `s=${s}`);
});