import { test } from 'node:test';
import assert from 'node:assert/strict';
import { admittanceFromImpedance, constantRCircle, constantXCircle } from '../../src/math/smithmath.ts';

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

test('admittanceFromImpedance: 1/50 = 0.02 S', () => {
  const y = admittanceFromImpedance({ re: 50, im: 0 });
  assert.ok(near(y.re, 0.02) && near(y.im, 0), JSON.stringify(y));
});
test('admittanceFromImpedance: 1/(1+j) = 0.5 - j0.5', () => {
  const y = admittanceFromImpedance({ re: 1, im: 1 });
  assert.ok(near(y.re, 0.5) && near(y.im, -0.5), JSON.stringify(y));
});
test('admittanceFromImpedance: 1/(j50) = -j0.02', () => {
  const y = admittanceFromImpedance({ re: 0, im: 50 });
  assert.ok(near(y.re, 0) && near(y.im, -0.02), JSON.stringify(y));
});
test('constantRCircle(1) -> center (0.5,0), radius 0.5', () => {
  const c = constantRCircle(1);
  assert.ok(near(c.cx, 0.5) && near(c.cy, 0) && near(c.radius, 0.5), JSON.stringify(c));
});
test('constantRCircle(0) -> unit boundary: center (0,0), radius 1', () => {
  const c = constantRCircle(0);
  assert.ok(near(c.cx, 0) && near(c.cy, 0) && near(c.radius, 1), JSON.stringify(c));
});
test('constantRCircle(2) -> center (2/3,0), radius 1/3', () => {
  const c = constantRCircle(2);
  assert.ok(near(c.cx, 2 / 3) && near(c.cy, 0) && near(c.radius, 1 / 3), JSON.stringify(c));
});
test('constantXCircle(1) -> center (1,1), radius 1', () => {
  const c = constantXCircle(1);
  assert.ok(near(c.cx, 1) && near(c.cy, 1) && near(c.radius, 1), JSON.stringify(c));
});
test('constantXCircle(-1) -> center (1,-1), radius 1', () => {
  const c = constantXCircle(-1);
  assert.ok(near(c.cx, 1) && near(c.cy, -1) && near(c.radius, 1), JSON.stringify(c));
});
test('constantXCircle(2) -> center (1,0.5), radius 0.5', () => {
  const c = constantXCircle(2);
  assert.ok(near(c.cx, 1) && near(c.cy, 0.5) && near(c.radius, 0.5), JSON.stringify(c));
});
test('constantXCircle(0) -> non-finite (real-axis degenerate, no circle)', () => {
  const c = constantXCircle(0);
  assert.ok(!Number.isFinite(c.cy) && !Number.isFinite(c.radius), JSON.stringify(c));
});
