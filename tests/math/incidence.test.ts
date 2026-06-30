import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  snell,
  fresnelPerp,
  fresnelParallel,
  criticalAngle,
  brewsterAngle,
} from '../../src/math/incidence.ts';

const D = Math.PI / 180; // deg → rad

test('snell: air→glass, 30° → 19.471°', () => {
  const t2 = snell(1, 1.5, 30 * D);
  assert.ok(Math.abs(t2 - 19.471 * D) < 0.01 * D, `t2=${t2 / D}°`);
});

test('fresnelPerp: normal incidence → (n1−n2)/(n1+n2) = −0.2', () => {
  const g = fresnelPerp(1, 1.5, 0);
  assert.ok(Math.abs(g - -0.2) < 1e-9, `g=${g}`);
});

test('fresnelPerp: 30° → ≈ −0.2404', () => {
  const g = fresnelPerp(1, 1.5, 30 * D);
  assert.ok(Math.abs(g - -0.2404) < 1e-3, `g=${g}`);
});

test('fresnelParallel: at Brewster angle → 0', () => {
  const b = brewsterAngle(1, 1.5);
  const g = fresnelParallel(1, 1.5, b);
  assert.ok(Math.abs(g) < 1e-9, `g=${g}`);
});

test('brewsterAngle: air→glass → 56.31°', () => {
  const b = brewsterAngle(1, 1.5);
  assert.ok(Math.abs(b - 56.31 * D) < 0.01 * D, `b=${b / D}°`);
});

test('criticalAngle: glass→air → 41.81°, air→glass → null', () => {
  const c = criticalAngle(1.5, 1);
  assert.ok(c !== null && Math.abs(c - 41.81 * D) < 0.01 * D, `c=${c}`);
  assert.equal(criticalAngle(1, 1.5), null);
});

test('TIR: snell + fresnel return NaN above critical angle', () => {
  // glass→air, θc ≈ 41.81°; 50° exceeds it
  assert.ok(Number.isNaN(snell(1.5, 1, 50 * D)));
  assert.ok(Number.isNaN(fresnelPerp(1.5, 1, 50 * D)));
  assert.ok(Number.isNaN(fresnelParallel(1.5, 1, 50 * D)));
});