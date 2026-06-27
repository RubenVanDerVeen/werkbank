import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routhArray, routhStability, auxiliaryEquationWarning } from '../../src/math/routh.ts';

test('routhArray for s^3 + 2s^2 + 3s + 4 has first column 1,2,1,4', () => {
  const r = routhArray([1, 2, 3, 4]);
  assert.deepEqual(r.map((row) => row[0]), [1, 2, 1, 4]);
});

test('routhStability: s^3+6s^2+11s+6 is stable (no sign changes)', () => {
  assert.equal(routhStability([1, 6, 11, 6]), 'stable');
});

test('routhStability: s^3+s^2+s+1 has sign changes (unstable)', () => {
  assert.equal(routhStability([1, 1, 1, 1]), 'unstable');
});

test('auxiliaryEquationWarning fires on a zero row', () => {
  const w = auxiliaryEquationWarning([1, 0, 3, 0, 2]);
  assert.equal(w.kind, 'auxiliary');
});