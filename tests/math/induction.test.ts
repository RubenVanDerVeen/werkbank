import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  faradayEmf, motionalEmf, selfInductance, mutualInductance,
  displacementCurrent, inductionTimeSeries,
} from '../../src/math/induction.ts';

test('faradayEmf: N=100, B=0.5, A=0.01, θ=0, dBdt=2 → -2.0 V', () => {
  assert.ok(Math.abs(faradayEmf(100, 0.5, 0.01, 0, 2) - (-2.0)) < 1e-9);
});

test('faradayEmf: θ=π/2 → 0 (flux perpendicular to normal)', () => {
  assert.ok(Math.abs(faradayEmf(100, 0.5, 0.01, Math.PI / 2, 2)) < 1e-12);
});

test('motionalEmf: B=1, L=0.5, v=2 → 1.0 V', () => {
  assert.ok(Math.abs(motionalEmf(1, 0.5, 2) - 1.0) < 1e-9);
});

test('selfInductance: N=100, Φ=0.05, I=0.5 → 10 H', () => {
  assert.ok(Math.abs(selfInductance(100, 0.05, 0.5) - 10) < 1e-9);
});

test('mutualInductance: N2=200, Φ21=0.01, I1=0.2 → 10 H', () => {
  assert.ok(Math.abs(mutualInductance(200, 0.01, 0.2) - 10) < 1e-9);
});

test('displacementCurrent: ε₀=8.854e-12, dΦE/dt=1e12 → 8.854 A', () => {
  assert.ok(Math.abs(displacementCurrent(8.854e-12, 1e12) - 8.854) < 1e-6);
});

test('inductionTimeSeries: at t=0, Φ=0, emf=-N·A·cosθ·B·2πf', () => {
  const { phi, emf } = inductionTimeSeries(100, 0.5, 0.01, 0, 1, 1, 100);
  const p0 = phi[0]!;
  const e0 = emf[0]!;
  assert.ok(Math.abs(p0.y) < 1e-12, `phi[0]=${p0.y}`);
  assert.ok(Math.abs(e0.y + Math.PI) < 1e-6, `emf[0]=${e0.y}`);
});

test('selfInductance: I=0 throws', () => {
  assert.throws(() => selfInductance(100, 0.05, 0), /I = 0/);
});