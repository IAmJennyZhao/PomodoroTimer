'use strict';

// Read-only lookup for original hashes preserved in dated evidence.
const fs = require('node:fs');
const path = require('node:path');
try {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !/^[a-f0-9]{7,40}$/i.test(args[0])) {
    throw new Error('Usage: npm run history:lookup -- <original-or-cleaned-hash> (7–40 hex characters)');
  }
  const map = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/history/COMMIT_MAP.json'), 'utf8'));
  const prefix = args[0].toLowerCase();
  const matches = map.commits.filter(row => row.original.startsWith(prefix) || row.cleaned.startsWith(prefix));
  if (matches.length !== 1) throw new Error(matches.length ? 'Ambiguous hash; supply more characters.' : 'Hash is outside the rewritten commit map.');
  const { original, cleaned, subject } = matches[0];
  console.log(JSON.stringify({ original, cleaned, subject }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
