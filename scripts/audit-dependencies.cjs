'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function findings(report) {
  if (report.error || report.auditReportVersion !== 2 || !report.vulnerabilities
    || typeof report.vulnerabilities !== 'object' || !report.metadata?.vulnerabilities
    || !Number.isInteger(report.metadata.dependencies?.total) || report.metadata.dependencies.total < 1
    || Object.keys(report.vulnerabilities).length !== report.metadata.vulnerabilities.total) {
    throw new Error('Incomplete npm audit response; no pass can be recorded.');
  }
  return Object.values(report.vulnerabilities).flatMap(item => {
    if (!Array.isArray(item.via) || !Array.isArray(item.nodes)) throw new Error('Malformed advisory details.');
    if (item.via.some(via => typeof via === 'string' && !report.vulnerabilities[via])) throw new Error('Incomplete advisory dependency chain.');
    return item.via.filter(via => typeof via === 'object').map(via => {
      if (!Number.isInteger(via.source) || !via.url || !via.severity || !via.range) throw new Error('Malformed advisory.');
      return { package: item.name, advisory: via.source, severity: via.severity, range: via.range, url: via.url };
    });
  }).sort((a, b) => `${a.package}/${a.advisory}`.localeCompare(`${b.package}/${b.advisory}`));
}

function assess(report, policy, lock, today = new Date().toISOString().slice(0, 10)) {
  const current = findings(report);
  if (Object.keys(report.vulnerabilities).length && !current.length) throw new Error('Missing source advisories.');
  if (policy.schemaVersion !== 1 || !Array.isArray(policy.exceptions) || !/^\d{4}-\d{2}-\d{2}$/.test(policy.reviewBy)) {
    throw new Error('Invalid dependency review policy.');
  }
  if (policy.reviewBy < today) throw new Error(`Dependency review expired on ${policy.reviewBy}. Reevaluate the exceptions.`);
  const unreviewed = current.filter(item => !policy.exceptions.some(exception =>
    ['package', 'advisory', 'severity', 'range', 'url'].every(key => exception[key] === item[key])
    && report.vulnerabilities[item.package].nodes.every(node =>
      lock.packages[node]?.dev === true && exception.versions.includes(lock.packages[node]?.version))));
  if (unreviewed.length) throw new Error(`New or changed dependency advisories:\n${unreviewed.map(item => `${item.package}: ${item.severity} ${item.url}`).join('\n')}`);
  return { affectedPackages: Object.keys(report.vulnerabilities).length, reviewedAdvisories: current.length };
}

function main() {
  const root = path.resolve(__dirname, '..');
  if (!process.env.npm_execpath) throw new Error('Run through npm run audit:dependencies.');
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'audit', '--json'], {
    cwd: root, encoding: 'utf8', timeout: 120_000, maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (![0, 1].includes(result.status)) throw new Error('npm audit could not complete. Check registry/network access.');
  let report;
  try { report = JSON.parse(result.stdout); }
  catch { throw new Error('npm audit returned invalid JSON.'); }
  const summary = assess(report, JSON.parse(fs.readFileSync(path.join(root, 'docs/DEPENDENCY_REVIEW.json'), 'utf8')),
    JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8')));
  if ((result.status === 0) !== (summary.affectedPackages === 0)) throw new Error('npm audit exit status disagrees with its report.');
  console.log(`Dependency review: ${summary.affectedPackages} affected tooling packages, ${summary.reviewedAdvisories} reviewed advisories. See docs/DEPENDENCIES.md.`);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { findings, assess };
