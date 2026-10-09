'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const audit = path.resolve(__dirname, '../scripts/audit-publication.cjs');

test('publication audit distinguishes a clean ancestry from a private side branch', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'little-room-audit-test-'));
  const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  const run = (...args) => JSON.parse(execFileSync(process.execPath, [audit, ...args], { cwd: directory, encoding: 'utf8' }));
  try {
    git('init', '-b', 'main');
    git('config', 'user.name', 'Fixture Author');
    git('config', 'user.email', 'noreply@github.com');
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name: 'audit-fixture' }));
    fs.writeFileSync(path.join(directory, 'package-lock.json'), JSON.stringify({ packages: {} }));
    git('add', '.');
    git('-c', 'commit.gpgsign=false', 'commit', '-m', 'Clean root');
    git('switch', '-c', 'private-evidence');
    fs.writeFileSync(path.join(directory, 'private.txt'), 'ghp_' + 'A'.repeat(36));
    git('add', '.');
    git('-c', 'commit.gpgsign=false', '-c', 'user.email=fixture' + '@' + 'example.test', 'commit', '-m', 'Private fixture');
    git('switch', 'main');
    fs.writeFileSync(path.join(directory, 'README.md'), 'Clean public documentation\n');
    git('add', '.');
    git('-c', 'commit.gpgsign=false', 'commit', '-m', 'Clean child');

    const selected = run('--ref', 'HEAD');
    assert.equal(selected.historySelection.mode, 'single-ref');
    assert.equal(selected.historySelection.tip, git('rev-parse', 'HEAD').trim());
    assert.equal(selected.summary.reachableCommits, 2);
    assert.equal(selected.summary.commitsWithPersonalEmail, 0);
    assert.deepEqual(selected.findings, []);

    const all = run();
    assert.equal(all.historySelection.mode, 'all-refs');
    assert.equal(all.summary.reachableCommits, 3);
    assert.equal(all.summary.commitsWithPersonalEmail, 1);
    assert.ok(all.findings.some(item => item.scope === 'history' && item.category === 'credential-format'));

    const privateBranch = run('--ref', 'private-evidence');
    assert.equal(privateBranch.summary.reachableCommits, 2);
    assert.equal(privateBranch.summary.commitsWithPersonalEmail, 1);
    assert.ok(privateBranch.findings.some(item => item.scope === 'history' && item.category === 'credential-format'));
    assert.ok(!JSON.stringify(all).includes('ghp_' + 'A'.repeat(36)));
    assert.ok(!JSON.stringify(all).includes('fixture' + '@' + 'example.test'));

    for (const invalid of [['--ref', '--all'], ['--ref'], ['--unknown'], ['--ref', 'missing-branch']]) {
      const result = spawnSync(process.execPath, [audit, ...invalid], { cwd: directory, encoding: 'utf8' });
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, '');
    }
  } finally {
    assert.equal(path.dirname(directory), os.tmpdir());
    assert.ok(path.basename(directory).startsWith('little-room-audit-test-'));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
