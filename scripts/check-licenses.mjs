#!/usr/bin/env node
// Checks the licenses of all production dependencies (what ends up in the
// Docker image / client bundle) against an allowlist of licenses that are
// compatible with distributing this project under the MIT License.
// Uses `npm query`, so no extra tooling is needed. Run: npm run licenses
import { execFileSync } from 'node:child_process';

const ALLOWED = new Set([
  'MIT',
  'MIT-0',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  '0BSD',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'CC-BY-4.0',
  'Unlicense',
  'OFL-1.1', // fonts (Inter, Nunito, Fredoka)
  'Python-2.0',
  'Zlib',
]);

function licenseOf(pkg) {
  const l = pkg.license ?? pkg.licenses;
  if (!l) return 'UNKNOWN';
  if (typeof l === 'string') return l;
  if (Array.isArray(l)) return l.map((x) => x.type ?? x).join(' OR ');
  return l.type ?? 'UNKNOWN';
}

/** Accepts SPDX expressions like "(MIT OR Apache-2.0)" if any alternative is allowed. */
function isAllowed(expr) {
  const alternatives = expr.replace(/[()]/g, '').split(/\s+OR\s+/i);
  return alternatives.some((alt) => alt.split(/\s+AND\s+/i).every((part) => ALLOWED.has(part.trim())));
}

const nodes = JSON.parse(execFileSync('npm', ['query', '.prod'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
const seen = new Map();
for (const node of nodes) {
  if (node.isWorkspace || node.name?.startsWith('@pet-manager/') || node.name === 'pet-manager') continue;
  seen.set(`${node.name}@${node.version}`, licenseOf(node));
}

const counts = {};
const problems = [];
for (const [pkg, license] of seen) {
  counts[license] = (counts[license] ?? 0) + 1;
  if (!isAllowed(license)) problems.push(`${pkg}: ${license}`);
}

console.log(`Production dependencies: ${seen.size}`);
for (const [license, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${license}: ${n}`);
if (problems.length) {
  console.error(`\nLicenses not on the allowlist (review manually):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('\nAll production dependency licenses are on the allowlist.');
