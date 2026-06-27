import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modules } from '../src/registry.ts';

test('registry imports without throwing', () => {
  assert.ok(Array.isArray(modules));
});

test('every registered module has required fields', () => {
  for (const m of modules) {
    assert.ok(m.id, 'id');
    assert.ok(m.title, 'title');
    assert.ok(m.course, 'course');
    assert.ok(m.description, 'description');
    assert.equal(typeof m.render, 'function');
  }
});
