'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assess } = require('../scripts/audit-dependencies.cjs');

const advisory = { source: 123, severity: 'high', range: '<2', url: 'https://example.test/advisory' };
const report = { auditReportVersion: 2, vulnerabilities: { tool: { name: 'tool', via: [advisory], nodes: ['node_modules/tool'] } },
  metadata: { vulnerabilities: { total: 1 }, dependencies: { total: 10 } } };
const policy = { schemaVersion: 1, reviewBy: '2026-11-30', exceptions: [{ package: 'tool', advisory: 123,
  severity: 'high', range: '<2', url: advisory.url, versions: ['1.0.0'] }] };
const lock = { packages: { 'node_modules/tool': { version: '1.0.0', dev: true } } };

test('only exact reviewed advisories and installed versions pass the dependency gate', () => {
  assert.deepEqual(assess(report, policy, lock, '2026-10-09'), { affectedPackages: 1, reviewedAdvisories: 1 });
  for (const change of [{ source: 456 }, { severity: 'critical' }, { range: '<3' }]) {
    const changed = structuredClone(report);
    Object.assign(changed.vulnerabilities.tool.via[0], change);
    assert.throws(() => assess(changed, policy, lock, '2026-10-09'), /New or changed/);
  }
  assert.throws(() => assess(report, policy, { packages: { 'node_modules/tool': { version: '1.1.0', dev: true } } }, '2026-10-09'), /New or changed/);
  assert.throws(() => assess(report, policy, { packages: { 'node_modules/tool': { version: '1.0.0' } } }, '2026-10-09'), /New or changed/);
});

test('registry errors, partial responses and expired exceptions fail rather than reporting green', () => {
  assert.throws(() => assess({ ...report, error: { code: 'ENOTCACHED' } }, policy, lock, '2026-10-09'), /Incomplete/);
  assert.throws(() => assess({ vulnerabilities: {} }, policy, lock, '2026-10-09'), /Incomplete/);
  assert.throws(() => assess({ ...report, vulnerabilities: {} }, policy, lock, '2026-10-09'), /Incomplete/);
  const missing = structuredClone(report);
  missing.vulnerabilities.tool.via = ['unknown'];
  assert.throws(() => assess(missing, policy, lock, '2026-10-09'), /Incomplete advisory/);
  assert.throws(() => assess(report, policy, lock, '2026-12-01'), /expired/);
  const fixed = { ...report, vulnerabilities: {}, metadata: { vulnerabilities: { total: 0 }, dependencies: { total: 10 } } };
  assert.deepEqual(assess(fixed, policy, lock, '2026-10-09'), { affectedPackages: 0, reviewedAdvisories: 0 });
});
