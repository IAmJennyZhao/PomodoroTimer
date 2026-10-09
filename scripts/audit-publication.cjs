'use strict';

// Read-only, dependency-free publication review. It is not a security certificate.
// Locations and categories are emitted, never matched source values or identities.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { inflateSync } = require('node:zlib');

const cwd = process.cwd();
const git = (...args) => execFileSync('git', args, {
  cwd, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024,
});
const root = git('rev-parse', '--show-toplevel').trim();
const files = git('ls-files', '-z').split('\0').filter(Boolean);
const findings = [];
const rules = [
  ['credential-format', /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{60,255}|(?:AKIA|ASIA)[A-Z0-9]{16}|AIzaSy[A-Za-z0-9_-]{33}|sk_live_[A-Za-z0-9]{20,})\b/g],
  ['private-key', /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g],
  ['credential-assignment', /(?:api[_-]?key|password|secret|access[_-]?token)\s*["']?\s*[:=]\s*["']([^"'\r\n]{8,})["']/gi],
  ['authenticated-url', /\b(?:https?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s/:]+:[^\s/@]+@/gi],
  ['email-address', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ['user-path', /(?:[A-Z]:[\\/]+Users[\\/]+[^\s"'<>]+|\/(?:Users|home)\/[^\s"'<>]+)/gi],
];

function scan(text, scope, location, blob = null, regions = []) {
  for (const [category, regex] of rules) {
    regex.lastIndex = 0;
    for (const match of text.matchAll(regex)) {
      if (category === 'credential-assignment' && /^(?:false|true|undefined|null|example|test|dummy|fake|placeholder|your[-_ ])/i.test(match[1])) continue;
      const region = regions.find(item => match.index >= item.start && match.index < item.end);
      findings.push({ scope, location, blob, category,
        line: text.slice(0, match.index).split('\n').length,
        ...(region ? { binaryRegion: region.type } : {}) });
    }
  }
}

function inspect(buffer, scope, location, blob = null) {
  // Binary text/metadata may hold paths or identifying data. Do not claim OCR.
  if (!buffer.subarray(0, 8000).includes(0)) {
    scan(buffer.toString('utf8'), scope, location, blob);
    return 'text';
  }
  const regions = [];
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    for (let offset = 8; offset + 12 <= buffer.length;) {
      const length = buffer.readUInt32BE(offset);
      if (offset + 12 + length > buffer.length) throw new Error(`Invalid PNG chunk in ${location}`);
      const type = buffer.toString('ascii', offset + 4, offset + 8);
      const data = buffer.subarray(offset + 8, offset + 8 + length);
      regions.push({ start: offset + 8, end: offset + 8 + length, type: type === 'IDAT' ? 'PNG compressed pixels' : `PNG ${type}` });
      if (type === 'zTXt' || type === 'iTXt') {
        const separator = data.indexOf(0);
        if (separator >= 0) {
          try {
            if (type === 'zTXt') scan(inflateSync(data.subarray(separator + 2), { maxOutputLength: 1024 * 1024 }).toString('utf8'), `${scope}-png-metadata`, location, blob);
            else if (data[separator + 1] === 1) {
              const languageEnd = data.indexOf(0, separator + 3);
              const translatedEnd = data.indexOf(0, languageEnd + 1);
              if (languageEnd >= 0 && translatedEnd >= 0) scan(inflateSync(data.subarray(translatedEnd + 1), { maxOutputLength: 1024 * 1024 }).toString('utf8'), `${scope}-png-metadata`, location, blob);
            }
          } catch { throw new Error(`PNG metadata could not be inspected in ${location}`); }
        }
      }
      offset += length + 12;
    }
  } else if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    // JPEG screenshots sometimes use a .png filename. Locate entropy-coded
    // pixels so random compressed bytes are not confused with actual metadata.
    for (let cursor = 2; cursor + 4 <= buffer.length;) {
      if (buffer[cursor] !== 0xff) break;
      while (buffer[cursor] === 0xff) cursor++;
      const marker = buffer[cursor++];
      if (marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const length = buffer.readUInt16BE(cursor);
      if (length < 2 || cursor + length > buffer.length) break;
      if (marker === 0xda) {
        regions.push({ start: cursor + length, end: buffer.length - 2, type: 'JPEG compressed pixels' });
        break;
      }
      regions.push({ start: cursor + 2, end: cursor + length, type: `JPEG marker ${marker.toString(16)}` });
      cursor += length;
    }
  }
  scan(buffer.toString('latin1'), `${scope}-binary-strings`, location, blob, regions);
  return 'binary';
}

const current = [];
for (const location of files) {
  const buffer = fs.readFileSync(path.join(root, location));
  current.push({ path: location, bytes: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    kind: inspect(buffer, 'worktree', location) });
}

// --all includes local branches, remote-tracking refs and tags, not just HEAD.
const objects = git('rev-list', '--objects', '--all').trim().split('\n').map(line => {
  const separator = line.indexOf(' ');
  return { oid: separator < 0 ? line : line.slice(0, separator),
    location: separator < 0 ? '(unnamed object)' : line.slice(separator + 1) };
});
const batch = execFileSync('git', ['cat-file', '--batch'], {
  cwd, input: objects.map(object => object.oid).join('\n') + '\n',
  maxBuffer: 512 * 1024 * 1024,
});
let offset = 0;
let blobs = 0;
let textBlobs = 0;
let binaryBlobs = 0;
let commits = 0;
let commitsWithPersonalEmail = 0;
for (const object of objects) {
  const end = batch.indexOf(10, offset);
  const [oid, type, rawSize] = batch.toString('utf8', offset, end).split(' ');
  const size = Number(rawSize);
  if (end < 0 || oid !== object.oid || !Number.isSafeInteger(size)) throw new Error('Incomplete Git object audit');
  const buffer = batch.subarray(end + 1, end + 1 + size);
  if (buffer.length !== size) throw new Error('Truncated Git object audit');
  if (type === 'blob') {
    blobs++;
    if (inspect(buffer, 'history', object.location, oid) === 'text') textBlobs++;
    else binaryBlobs++;
  } else if (type === 'commit') {
    commits++;
    const text = buffer.toString('utf8');
    const split = text.indexOf('\n\n');
    const identities = text.slice(0, split).split('\n').filter(line => /^(?:author|committer) /.test(line));
    if (identities.some(line => !/<(?:[^>]*@users\.noreply\.github\.com|noreply@github\.com)>/.test(line))) commitsWithPersonalEmail++;
    scan(text.slice(split + 2), 'commit-message', oid, oid);
  }
  offset = end + 1 + size + 1;
}
if (offset !== batch.length) throw new Error('Unconsumed Git object audit output');

const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const packages = Object.entries(lock.packages).filter(([location]) => location);
const dependencies = packages.map(([location, locked]) => {
  const file = path.join(root, location, 'package.json');
  const installed = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  const rawLicense = installed?.license || installed?.licenses || locked.license || null;
  const declaredLicense = typeof rawLicense === 'string' ? rawLicense
    : Array.isArray(rawLicense) ? rawLicense.map(item => item.type || item).join(' OR ')
      : rawLicense?.type || null;
  const noticeFiles = installed ? fs.readdirSync(path.dirname(file)).filter(name => /^(?:licen[cs]e|copying|notice)(?:[._-]|$)/i.test(name)) : [];
  return { path: location, name: installed?.name || location.split('node_modules/').at(-1),
    lockedVersion: locked.version, installedVersion: installed?.version || null,
    declaredLicense, noticeFiles, versionMatches: installed ? installed.version === locked.version : null,
    direct: Object.hasOwn({ ...pkg.dependencies, ...pkg.devDependencies }, installed?.name || location.slice(13)) };
});

const outputFiles = current.filter(file => file.path.startsWith('output/'));
const counts = {};
for (const finding of findings) counts[finding.category] = (counts[finding.category] || 0) + 1;
const report = {
  head: git('rev-parse', 'HEAD').trim(),
  scopes: ['tracked worktree files', 'all unique blobs reachable from local refs', 'commit messages', 'author/committer metadata', 'binary strings and PNG compressed text metadata', 'lockfile and available installed manifests'],
  summary: { trackedFiles: current.length, outputFiles: outputFiles.length,
    outputBytes: outputFiles.reduce((sum, file) => sum + file.bytes, 0),
    reachableCommits: commits, reachableBlobs: blobs, textBlobs, binaryBlobs,
    commitsWithPersonalEmail, candidateCounts: counts,
    lockedPackages: dependencies.length,
    installedPackages: dependencies.filter(item => item.installedVersion).length,
    versionMismatches: dependencies.filter(item => item.versionMatches === false).length,
    missingLicenseDeclarations: dependencies.filter(item => !item.declaredLicense).length },
  current, findings, dependencies,
  limitations: ['Pattern matches require human review; absence is not proof of no secrets.',
    'Historical objects are deduplicated and use one representative Git path per object.',
    'Untracked/ignored content, unreachable objects/reflogs, other clones/forks, remote PR refs and hosted caches are not scanned.',
    'Binary strings and PNG text inspection are not OCR, full EXIF review or visual screenshot approval.',
    'Dependency declarations are not complete distribution notices or legal clearance.',
    'The script does not read the external personal runtime save folder, mutate Git or publish files.'],
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
