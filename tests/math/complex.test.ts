import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cmul, cdiv, cabs, cphaseDeg, fromPolar, magPhaseAtJw } from '../../src/math/complex.ts';

test('cmul (1+2j)(3+4j) = -5+10j', () => {
  const r = cmul({ re: 1, im: 2 }, { re: 3, im: 4 });
  assert.ok(Math.abs(r.re - -5) < 1e-9 && Math.abs(r.im - 10) < 1e-9, JSON.stringify(r));
});
test('cdiv 1/j = -j', () => {
  const r = cdiv({ re: 1, im: 0 }, { re: 0, im: 1 });
  assert.ok(Math.abs(r.re) < 1e-9 && Math.abs(r.im - -1) < 1e-9, JSON.stringify(r));
});
test('cabs(3+4j) = 5', () => { assert.ok(Math.abs(cabs({ re: 3, im: 4 }) - 5) < 1e-9); });
test('cphaseDeg(0+1j) = 90', () => { assert.ok(Math.abs(cphaseDeg({ re: 0, im: 1 }) - 90) < 1e-9); });
test('fromPolar(2,90) = 0+2j', () => {
  const r = fromPolar(2, 90);
  assert.ok(Math.abs(r.re) < 1e-9 && Math.abs(r.im - 2) < 1e-9, JSON.stringify(r));
});

test('H=1/(s+1) at w=1 → -3.01 dB, -45°', () => {
  const tf = { num: [1], den: [1, 1] };
  const { magDb, phaseDeg } = magPhaseAtJw(tf, 1);
  assert.ok(Math.abs(magDb - -3.0103) < 0.01, `magDb=${magDb}`);
  assert.ok(Math.abs(phaseDeg - -45) < 0.01, `phaseDeg=${phaseDeg}`);
});
