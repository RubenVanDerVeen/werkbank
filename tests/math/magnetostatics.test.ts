import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MU_0, wireField, wireField2D, loopField, segmentField,
  solenoidField, solenoidInductance, toroidField, toroidInductance,
  reluctance, flux,
} from '../../src/math/magnetostatics.ts';

const near = (a: number, b: number, rel = 1e-9) =>
  Math.abs(a - b) <= rel * Math.max(1, Math.abs(b));

test('MU_0 = 4π·1e-7', () => {
  assert.ok(near(MU_0, 4 * Math.PI * 1e-7));
});

test('wireField(1, 0.01) = 2e-5 T', () => {
  assert.ok(near(wireField(1, 0.01), 2e-5), `B=${wireField(1, 0.01)}`);
});

test('wireField(1, 0.02) = 1e-5 T (inverse r)', () => {
  assert.ok(near(wireField(1, 0.02), 1e-5));
});

test('wireField2D magnitude matches wireField', () => {
  const b = wireField2D(1, 0, 0, 0.01, 0);
  assert.ok(near(Math.hypot(b.Bx, b.By), wireField(1, 0.01)));
});

test('loopField(1, 0.1, 0) = μ₀/(2R) ≈ 6.283e-6 T', () => {
  assert.ok(near(loopField(1, 0.1, 0), MU_0 / 0.2));
});

test('segmentField(1, 0.01, -1, 1) → infinite-wire 2e-5/√1.0001', () => {
  assert.ok(near(segmentField(1, 0.01, -1, 1), 2e-5 / Math.sqrt(1.0001)));
});

test('solenoidField(1000, 1) = μ₀nI ≈ 1.257e-3 T', () => {
  assert.ok(near(solenoidField(1000, 1), MU_0 * 1000));
});

test('solenoidInductance(100, 1e-4, 0.1) = μ₀·10 ≈ 1.257e-5 H', () => {
  assert.ok(near(solenoidInductance(100, 1e-4, 0.1), MU_0 * 10));
});

test('toroidField(100, 1, 0.1) = 2e-4 T', () => {
  assert.ok(near(toroidField(100, 1, 0.1), 2e-4));
});

test('toroidInductance(100, 1e-4, 0.1) = 2e-6 H', () => {
  assert.ok(near(toroidInductance(100, 1e-4, 0.1), 2e-6));
});

test('reluctance(0.1, μ₀, 1e-4) ≈ 7.958e8 A/Wb', () => {
  assert.ok(near(reluctance(0.1, MU_0, 1e-4), 0.1 / (MU_0 * 1e-4)));
});

test('flux(100, 1, ℛ) = 100/ℛ ≈ 1.257e-7 Wb', () => {
  const R = reluctance(0.1, MU_0, 1e-4);
  assert.ok(near(flux(100, 1, R), 100 / R));
});

test('wireField throws on r <= 0', () => {
  assert.throws(() => wireField(1, 0));
});