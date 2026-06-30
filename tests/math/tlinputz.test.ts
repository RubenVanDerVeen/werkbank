import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zinSweep, vmaxPosition, vminPosition } from '../../src/math/tlinputz.ts';

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

test('zinSweep matched load -> constant 50', () => {
  const pts = zinSweep({ re: 50, im: 0 }, 50, 0, Math.PI, 5);
  for (const p of pts) {
    assert.ok(near(p.zin.re, 50, 1e-6) && near(p.zin.im, 0, 1e-6), JSON.stringify(p));
  }
});

test('zinSweep short -> open at lambda/4', () => {
  const pts = zinSweep({ re: 0, im: 0 }, 50, 0, Math.PI, 5);
  assert.ok(near(pts[0]!.zin.re, 0, 1e-6) && near(pts[0]!.zin.im, 0, 1e-6), 'short at l=0');
  assert.ok(Math.abs(pts[2]!.zin.im) > 1e6, `open at lambda/4 (im huge): ${pts[2]!.zin.im}`);
  assert.ok(near(pts[2]!.zin.re, 0, 1e-3), `re near 0 at lambda/4: ${pts[2]!.zin.re}`);
  assert.ok(near(pts[4]!.zin.re, 0, 1e-3) && near(pts[4]!.zin.im, 0, 1e-3), 'short at lambda/2');
});

test('vmaxPosition Gamma=+0.5 -> 0 (load)', () => {
  assert.ok(near(vmaxPosition({ re: 0.5, im: 0 }), 0));
});

test('vminPosition Gamma=+0.5 -> 0.25', () => {
  assert.ok(near(vminPosition({ re: 0.5, im: 0 }), 0.25, 1e-6));
});

test('vmaxPosition Gamma=-0.5 -> 0.25 (lambda/4)', () => {
  assert.ok(near(vmaxPosition({ re: -0.5, im: 0 }), 0.25));
});