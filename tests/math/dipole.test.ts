import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hertzianPattern, halfWavePattern, hertzianRr, halfWaveRr,
  directivity, directivityDbi, hpbw, radiatedPower,
} from '../../src/math/dipole.ts';

test('hertzianPattern: max 1 at broadside, null at endfire', () => {
  assert.ok(Math.abs(hertzianPattern(Math.PI / 2) - 1) < 1e-9, 'broadside');
  assert.ok(hertzianPattern(0) < 1e-9, 'endfire 0');
  assert.ok(hertzianPattern(Math.PI) < 1e-9, 'endfire π'); // |sin π| ≈ 1e-16, not exact 0
});

test('halfWavePattern: max 1 at broadside, null at endfire (guarded 0/0)', () => {
  assert.ok(Math.abs(halfWavePattern(Math.PI / 2) - 1) < 1e-9, 'broadside');
  assert.ok(halfWavePattern(0) < 1e-9, 'endfire 0');
  assert.ok(halfWavePattern(Math.PI) < 1e-9, 'endfire π');
});

test('hertzianRr(0.1, 1.0) = 80π²·0.01 ≈ 7.8957', () => {
  assert.ok(Math.abs(hertzianRr(0.1, 1.0) - 80 * Math.PI ** 2 * 0.01) < 1e-6);
  assert.ok(Math.abs(hertzianRr(0.1, 1.0) - 7.8957) < 1e-3);
});

test('halfWaveRr = 73 Ω', () => {
  assert.equal(halfWaveRr(), 73);
});

test('directivity: hertzian 1.5, halfwave 1.64', () => {
  assert.ok(Math.abs(directivity('hertzian') - 1.5) < 1e-9);
  assert.ok(Math.abs(directivity('halfwave') - 1.64) < 1e-9);
});

test('directivityDbi: hertzian ≈ 1.76, halfwave ≈ 2.15', () => {
  assert.ok(Math.abs(directivityDbi('hertzian') - 10 * Math.log10(1.5)) < 1e-9);
  assert.ok(Math.abs(directivityDbi('hertzian') - 1.76) < 0.02);
  assert.ok(Math.abs(directivityDbi('halfwave') - 2.15) < 0.02);
});

test('hpbw: hertzian 90°, halfwave ≈ 78°', () => {
  assert.equal(hpbw('hertzian'), 90);
  assert.ok(Math.abs(hpbw('halfwave') - 78) < 1);
});

test('radiatedPower(1, 73) = 36.5 W', () => {
  assert.ok(Math.abs(radiatedPower(1, 73) - 36.5) < 1e-9);
});