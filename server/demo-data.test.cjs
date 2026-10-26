'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { demoState } = require('../scripts/demo-data.cjs');

test('fictional demo fills today and a month of analytics without future sessions', () => {
  const now = new Date(2026, 9, 26, 14).getTime();
  const state = demoState(now);
  assert.ok(state.history.length > 60);
  assert.equal(new Set(state.history.map(item => item.id)).size, state.history.length);
  assert.ok(new Set(state.history.flatMap(item => item.tags)).size >= 5);
  assert.ok(state.history.every(item => item.completedAt <= now && item.minutes > 0));
  const today = new Date(now).toDateString();
  assert.equal(state.history.filter(item => new Date(item.completedAt).toDateString() === today).length, 3);
  assert.equal(state.timer.status, 'idle');
  assert.equal(demoState(now).history.length, state.history.length);
});
