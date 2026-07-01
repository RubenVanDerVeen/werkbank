import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zToGamma, gammaToZ, swr, zinLossless, quarterWaveZ } from '../../src/math/tl.ts';

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;
const nearC = (r: { re: number; im: number }, re: number, im: number, eps = 1e-9) =>
  near(r.re, re, eps) && near(r.im, im, eps);

test('zToGamma matched load -> 0', () => {
  assert.ok(nearC(zToGamma({ re: 50, im: 0 }, 50), 0, 0), JSON.stringify(zToGamma({ re: 50, im: 0 }, 50)));
});
test('zToGamma short -> -1', () => {
  assert.ok(nearC(zToGamma({ re: 0, im: 0 }, 50), -1, 0));
});
test('zToGamma open -> +1', () => {
  assert.ok(nearC(zToGamma({ re: 1e9, im: 0 }, 50), 1, 0, 1e-6));
});
test('gammaToZ round-trip -> 50', () => {
  assert.ok(nearC(gammaToZ({ re: 0, im: 0 }, 50), 50, 0));
});
test('swr |Γ|=0.5 -> 3', () => {
  assert.ok(near(swr({ re: 0.5, im: 0 }), 3));
});
test('zinLossless short at λ/8 -> j*Z0*tan(π/4) = j*50', () => {
  const z = zinLossless({ re: 0, im: 0 }, Math.PI / 4, 50);
  assert.ok(nearC(z, 0, 50), `zin=${JSON.stringify(z)}`);
});
test('quarterWaveZ(100,50) -> 25', () => {
  assert.ok(near(quarterWaveZ(100, 50), 25));
});
