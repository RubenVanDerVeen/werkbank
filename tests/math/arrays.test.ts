import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  arrayFactor, nulls, broadsideHpbw, scanAngle, hasGratingLobe,
} from '../../src/math/arrays.ts';

const K = 2 * Math.PI; // λ = 1
const deg = (x: number) => (x * Math.PI) / 180;

test('broadside max: AF(90°) = 1 for N=4, d=λ/2, α=0', () => {
  assert.ok(Math.abs(arrayFactor(deg(90), 4, 0.5, 0, K) - 1) < 1e-9);
});

test('null at 60°: AF ≈ 0', () => {
  assert.ok(Math.abs(arrayFactor(deg(60), 4, 0.5, 0, K)) < 1e-6);
});

test('interior nulls of N=4, d=λ/2, α=0 are [60, 120]', () => {
  const n = nulls(4, 0.5, 0, K).map((x) => Math.round(x));
  assert.deepEqual(n, [60, 120]);
});

test('broadside HPBW N=4, d=λ/2 ≈ 25.4°', () => {
  assert.ok(Math.abs(broadsideHpbw(4, 0.5, 1) - 25.38) < 0.1);
});

test('scanAngle: α=0→90, α=-π→0, α=-π/2→60', () => {
  assert.ok(Math.abs(scanAngle(4, 0.5, 0, K) - 90) < 1e-9);
  assert.ok(Math.abs(scanAngle(4, 0.5, -Math.PI, K) - 0) < 1e-9);
  assert.ok(Math.abs(scanAngle(4, 0.5, -Math.PI / 2, K) - 60) < 1e-6);
});

test('grating lobe when d > λ', () => {
  assert.equal(hasGratingLobe(1.5, 1), true);
  assert.equal(hasGratingLobe(0.5, 1), false);
});