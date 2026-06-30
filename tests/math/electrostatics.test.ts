import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pointChargeField, pointChargePotential, superposeField, superposePotential,
  capacitance, gaussField,
} from '../../src/math/electrostatics.ts';

test('point charge field: 1nC at origin, obs (1,0) → Ex≈8.988, Ey=0', () => {
  const E = pointChargeField(1e-9, { x: 0, y: 0 }, { x: 1, y: 0 });
  assert.ok(Math.abs(E.Ex - 8.988) < 0.01, `Ex=${E.Ex}`);
  assert.ok(Math.abs(E.Ey) < 1e-9, `Ey=${E.Ey}`);
});

test('point charge potential: 1nC at origin, obs (1,0) → V≈8.988', () => {
  const V = pointChargePotential(1e-9, { x: 0, y: 0 }, { x: 1, y: 0 });
  assert.ok(Math.abs(V - 8.988) < 0.01, `V=${V}`);
});

test('dipole superposition at midpoint: Ex≈17.975, V=0', () => {
  const charges = [{ q: 1e-9, at: { x: -1, y: 0 } }, { q: -1e-9, at: { x: 1, y: 0 } }];
  const E = superposeField(charges, { x: 0, y: 0 });
  assert.ok(Math.abs(E.Ex - 17.975) < 0.01, `Ex=${E.Ex}`);
  assert.ok(Math.abs(E.Ey) < 1e-9, `Ey=${E.Ey}`);
  const V = superposePotential(charges, { x: 0, y: 0 });
  assert.ok(Math.abs(V) < 1e-9, `V=${V}`);
});

test('observer coincident with charge throws', () => {
  assert.throws(() => pointChargeField(1, { x: 0, y: 0 }, { x: 0, y: 0 }));
  assert.throws(() => pointChargePotential(1, { x: 0, y: 0 }, { x: 0, y: 0 }));
});

test('superposePotential: two equal charges at (1,0) and (2,0), obs (0,0) → V is finite, not 0', () => {
  // non-symmetric placement so cancellation can't mask a dropped or sign-flipped term
  const charges = [{ q: 1e-9, at: { x: 1, y: 0 } }, { q: 1e-9, at: { x: 2, y: 0 } }];
  const V = superposePotential(charges, { x: 0, y: 0 });
  assert.ok(Math.abs(V - 13.481) < 0.02, `V=${V}`); // K·1e-9·(1 + 0.5)
});

test('capacitance: plate A=1e-4, d=1e-3 → ≈0.885 pF', () => {
  const C = capacitance('plate', { A: 1e-4, d: 1e-3 });
  assert.ok(Math.abs(C - 8.854e-13) < 1e-14, `C=${C}`);
});

test('capacitance: coax L=1, a=1e-3, b=2e-3 → ≈80.3 pF', () => {
  const C = capacitance('coax', { L: 1, a: 1e-3, b: 2e-3 });
  assert.ok(Math.abs(C - 8.027e-11) < 1e-12, `C=${C}`);
});

test('capacitance: sphere r=1 → ≈111.3 pF', () => {
  const C = capacitance('sphere', { r: 1 });
  assert.ok(Math.abs(C - 1.11265e-10) < 1e-14, `C=${C}`);
});

test('capacitance: coax b<a throws', () => {
  assert.throws(() => capacitance('coax', { L: 1, a: 2e-3, b: 1e-3 }));
});

test('capacitance: plate d≤0 throws', () => {
  assert.throws(() => capacitance('plate', { A: 1e-4, d: 0 }));
  assert.throws(() => capacitance('plate', { A: 1e-4, d: -1 }));
});

test('gauss: sphere Q=1nC, r=1 → E≈8.988', () => {
  const E = gaussField('sphere', { Q: 1e-9 }, 1);
  assert.ok(Math.abs(E - 8.988) < 0.01, `E=${E}`);
});

test('gauss: cylinder λ=1nC/m, r=1 → E≈17.975', () => {
  const E = gaussField('cylinder', { lambda: 1e-9 }, 1);
  assert.ok(Math.abs(E - 17.975) < 0.01, `E=${E}`);
});

test('gauss: plane σ=1nC/m² → E≈56.47, independent of r', () => {
  const E1 = gaussField('plane', { sigma: 1e-9 }, 0.5);
  const E2 = gaussField('plane', { sigma: 1e-9 }, 10);
  assert.ok(Math.abs(E1 - E2) < 1e-9);
  assert.ok(Math.abs(E1 - 56.47) < 0.01, `E=${E1}`);
});

test('gauss: sphere/cylinder r≤0 throws', () => {
  assert.throws(() => gaussField('sphere', { Q: 1e-9 }, 0));
  assert.throws(() => gaussField('sphere', { Q: 1e-9 }, -1));
  assert.throws(() => gaussField('cylinder', { lambda: 1e-9 }, 0));
  assert.throws(() => gaussField('cylinder', { lambda: 1e-9 }, -1));
});
