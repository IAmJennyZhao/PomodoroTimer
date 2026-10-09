'use strict';

// Verify the retained publication ancestry. This never mutates refs or files.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 100 * 1024 * 1024 });
const text = (...args) => git(...args).toString('utf8').trim();
const requireCheck = (condition, message) => { if (!condition) throw new Error(message); };

try {
  const args = process.argv.slice(2);
  requireCheck(!args.length || (args.length === 2 && args[0] === '--ref' && args[1] && !args[1].startsWith('-')),
    'Usage: npm run history:verify -- [--ref <commit-or-ref>]');
  const tip = text('rev-parse', '--verify', '--end-of-options', `${args[1] || 'HEAD'}^{commit}`);
  const map = JSON.parse(fs.readFileSync(path.join(root, 'docs/history/COMMIT_MAP.json'), 'utf8'));
  requireCheck(map.formatVersion === 1 && map.commits.length === map.rewrittenCommits, 'Invalid or incomplete commit map.');
  requireCheck(map.rewrittenCommits === map.originalProjectCommits + 1, 'Original history or preparation checkpoint is missing.');
  const commits = text('rev-list', '--reverse', '--topo-order', tip).split('\n');
  const reachableCommits = new Set(commits);
  requireCheck(new Set(map.commits.map(row => row.original)).size === map.rewrittenCommits, 'Duplicate original commit mapping.');
  const byCleaned = new Map(map.commits.map(row => [row.cleaned, row]));
  const byOriginal = new Map(map.commits.map(row => [row.original, row.cleaned]));
  requireCheck(byCleaned.size === map.rewrittenCommits, 'Duplicate rewritten commit mapping.');
  requireCheck(map.commits.every(row => reachableCommits.has(row.cleaned)), 'A retained commit is missing from the selected ancestry.');
  requireCheck(commits.slice(0, map.rewrittenCommits).every((oid, index) => oid === map.commits[index].cleaned), 'Retained chronological order changed.');
  requireCheck(text('rev-parse', `${map.cleanedHead}^{tree}`) === map.finalTreeAtRewrite, 'Final tree at rewrite no longer matches its original tree.');
  const forbidden = location => map.exclusionPolicy.prefixes.some(prefix => location.startsWith(prefix)) || map.exclusionPolicy.files.includes(location);
  const objects = new Set(text('rev-list', '--objects', tip).split('\n').map(line => line.split(' ')[0]));
  requireCheck(map.excludedBlobIds.every(oid => !objects.has(oid)), 'An excluded historical artifact blob is reachable.');
  let emptyMappedCommits = 0;
  for (const oid of commits) {
    const raw = git('cat-file', 'commit', oid);
    const split = raw.indexOf(Buffer.from('\n\n'));
    requireCheck(split > 0, 'Invalid commit object.');
    const header = raw.subarray(0, split).toString('utf8').split('\n');
    const message = raw.subarray(split + 2);
    const identities = {};
    for (const type of ['author', 'committer']) {
      const identity = new RegExp('^' + type + ' (.+) <([^>]+)> (\\d+) ([+-]\\d{4})$').exec(header.find(line => line.startsWith(type + ' ')));
      requireCheck(identity && /(?:@users\.noreply\.github\.com|^noreply@github\.com)$/.test(identity[2]), 'Commit metadata contains a non-noreply identity.');
      identities[type] = { name: identity[1], timestamp: Number(identity[3]), timezone: identity[4] };
    }
    const row = byCleaned.get(oid);
    if (row) {
      requireCheck(createHash('sha256').update(message).digest('hex') === row.messageSha256, 'An original commit message changed.');
      requireCheck(message.toString('utf8').split('\n')[0] === row.subject, 'Mapped subject differs from its commit.');
      for (const type of ['author', 'committer']) requireCheck(JSON.stringify(identities[type]) === JSON.stringify(row[type]), 'Original author/committer name, date or timezone changed.');
      const parents = header.filter(line => line.startsWith('parent ')).map(line => line.slice(7));
      requireCheck(JSON.stringify(parents) === JSON.stringify(row.originalParents.map(parent => byOriginal.get(parent))), 'Retained parent topology changed.');
      if (parents.length === 1 && header.find(line => line.startsWith('tree ')).slice(5) === text('rev-parse', `${parents[0]}^{tree}`)) emptyMappedCommits++;
    }
    const files = git('ls-tree', '-rz', '--name-only', oid).toString('utf8').split('\0').filter(Boolean);
    requireCheck(files.every(location => !forbidden(location)), 'An excluded path appears in a historical tree.');
  }
  const media = JSON.parse(fs.readFileSync(path.join(root, 'docs/media/manifest.json'), 'utf8'));
  for (const item of media.artifacts) {
    const bytes = fs.readFileSync(path.join(root, 'docs/media', item.file));
    requireCheck(bytes.length === item.bytes && createHash('sha256').update(bytes).digest('hex') === item.sha256, 'A curated media file differs from its manifest.');
  }
  console.log(JSON.stringify({ tip, commitsInspected: commits.length, mappedCommits: map.rewrittenCommits,
    originalProjectCommitsRetained: map.originalProjectCommits, personalEmailCommits: 0,
    excludedPathsAbsentEveryCommit: map.uniqueExcludedPaths, excludedBlobsUnreachable: map.excludedBlobIds.length,
    originalMessagesNamesDatesAndTopologyMatch: true, emptyMappedCommitsRetained: emptyMappedCommits,
    finalTreeAtRewriteIdentical: true, showcaseHashesMatch: media.artifacts.length }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
