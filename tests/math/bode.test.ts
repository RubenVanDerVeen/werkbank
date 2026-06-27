import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tfFromCoeffs } from '../../src/math/tf.ts';
import { bode } from '../../src/math/bode.ts';

test('bode(1/(s+1)) at ω=1: mag ≈ -3 dB, phase ≈ -45°', () => {
  const sys = tfFromCoeffs([1], [1, 1]);
  const pts = bode(sys, [{ omega: 1 }]);
  const p = pts[0]!;
  assert.ok(Math.abs(p.magDb + 3.01) < 0.1, `mag=${p.magDb}`);
  assert.ok(Math.abs(p.phaseDeg + 45) < 0.5, `phase=${p.phaseDeg}`);
});

test('bode returns one point per input omega', () => {
  const sys = tfFromCoeffs([1], [1, 1]);
  const pts = bode(sys, [{ omega: 0.1 }, { omega: 1 }, { omega: 10 }]);
  assert.equal(pts.length, 3);
});