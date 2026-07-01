import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sToZ, returnLoss, insertionLoss, transducerGain, isStable } from '../../src/math/sparams.ts';

const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;

test('returnLoss |S11|=0.2 -> 14 dB', () => {
  assert.ok(near(returnLoss({ re: 0.2, im: 0 }), 13.98, 0.1));
});

test('insertionLoss |S21|=0.8 -> 1.94 dB', () => {
  assert.ok(near(insertionLoss({ re: 0.8, im: 0 }), 1.938, 0.01));
});

test('transducerGain |S21|=0.9 -> -0.915 dB', () => {
  assert.ok(near(transducerGain({ re: 0.9, im: 0 }), -0.915, 0.01));
});

test('sToZ ideal unilateral amplifier', () => {
  const z = sToZ(
    { S11: { re: 0, im: 0 }, S21: { re: 1, im: 0 }, S12: { re: 0, im: 0 }, S22: { re: 0, im: 0 } },
    50,
  );
  assert.ok(near(z.Z11.re, 50) && near(z.Z22.re, 50), `Z11=${z.Z11.re}, Z22=${z.Z22.re}`);
  assert.ok(near(z.Z21.re, 100), `Z21=${z.Z21.re}`);
  assert.ok(near(z.Z12.re, 0), `Z12=${z.Z12.re}`);
});

test('isStable unilateral (S12=0) -> stable', () => {
  const r = isStable(
    { S11: { re: 0.2, im: 0 }, S21: { re: 0.8, im: 0 }, S12: { re: 0, im: 0 }, S22: { re: 0.3, im: 0 } },
  );
  assert.ok(r.stable, `K=${r.K}, delta=${r.delta}`);
});