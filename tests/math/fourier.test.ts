import { test } from 'node:test';
import assert from 'node:assert/strict';
import { squareWaveCoeffs, partialSum } from '../../src/math/fourier.ts';
import type { Waveform } from '../../src/math/fourier.ts';

test('square wave odd harmonics: a_n = 0 for even n, |a_n| = 4/(nπ) for odd n', () => {
  const c = squareWaveCoeffs(7);
  assert.equal(c[0], 0);
  for (const n of [1, 3, 5, 7]) assert.ok(Math.abs(c[n]! - (4 / (n * Math.PI))) < 1e-9, `n=${n}`);
  for (const n of [2, 4, 6]) assert.equal(c[n], 0);
});

test('partialSum at t=0 for square wave with N=1 is ~1.273 (4/π)', () => {
  const c = squareWaveCoeffs(1);
  const v = partialSum(c, 0, 1);
  assert.ok(Math.abs(v - 4 / Math.PI) < 1e-9);
});

test('Waveform round-trips through name', () => {
  const w: Waveform = 'square';
  assert.equal(w, 'square');
});