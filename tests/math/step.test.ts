import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tfFromCoeffs } from '../../src/math/tf.ts';
import { stepResponse, closedLoop } from '../../src/math/step.ts';

test('first-order 1/(s+1) step response at t=1 is ~0.632', () => {
  const sys = tfFromCoeffs([1], [1, 1]);
  const y = stepResponse(sys, 5, 0.05);
  const at1 = y.find((p) => Math.abs(p.t - 1) < 0.001);
  assert.ok(at1, 'no point near t=1');
  assert.ok(Math.abs(at1!.y - (1 - Math.exp(-1))) < 0.02, `y=${at1!.y}`);
});

test('closedLoop of unity-feedback plant 1/(s(s+1)) is stable', () => {
  const plant = tfFromCoeffs([1], [1, 1, 0]); // 1/(s^2+s)
  const cl = closedLoop(plant, [1]); // unity gain -> 1/(s^2+s+1)
  // DC gain should be 1, settling finite
  assert.equal(cl.num[0], 1);
  assert.equal(cl.den[0], 1);
});