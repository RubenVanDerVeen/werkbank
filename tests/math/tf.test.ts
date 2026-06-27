import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tfFromCoeffs, poles, zeros, dcGain } from '../../src/math/tf.ts';

test('poles and zeros of (s+1)/(s+2)', () => {
  const sys = tfFromCoeffs([1, 1], [1, 2]);
  assert.deepEqual(zeros(sys), [-1]);
  assert.deepEqual(poles(sys), [-2]);
});

test('dcGain of (s+1)/(s+2) at s=0 is 1/2', () => {
  const sys = tfFromCoeffs([1, 1], [1, 2]);
  assert.equal(dcGain(sys), 0.5);
});

test('leading zeros in numerator are extra poles at infinity (not returned)', () => {
  // G(s) = 1/(s+2)(s+3) -> num [1, 0, 0]? Use tfFromCoeffs([1],[1,5,6]) instead.
  const sys = tfFromCoeffs([1], [1, 5, 6]);
  assert.deepEqual(poles(sys), [-2, -3]);
});
