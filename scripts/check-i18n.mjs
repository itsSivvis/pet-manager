#!/usr/bin/env node
// Verifies translation files:
//  1. every locale has exactly the same keys as the reference locale (en)
//  2. every literal key used in the client code via t('...') exists in en
//  3. interpolation placeholders ({{name}}) match between locales
//  4. every error code the API can return has a translation
// Exits with code 1 on problems (used in CI via `npm run i18n:check`).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = path.join(root, 'client/src/i18n/locales');
const srcDir = path.join(root, 'client/src');
const REFERENCE = 'en';
// i18next plural suffixes: a key `foo` may exist only as foo_one/foo_other.
const PLURAL = /_(zero|one|two|few|many|other)$/;

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out[key] = String(v);
  }
  return out;
}

const placeholders = (s) =>
  [...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)]
    .map((m) => m[1])
    .sort()
    .join(',');

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory()
      ? walk(p)
      : /\.(jsx?|mjs)$/.test(f) && !/\.test\./.test(f)
        ? [p]
        : [];
  });
}

const locales = Object.fromEntries(
  readdirSync(localesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => [
      path.basename(f, '.json'),
      flatten(JSON.parse(readFileSync(path.join(localesDir, f), 'utf8'))),
    ]),
);

const problems = [];
const ref = locales[REFERENCE];
for (const [lng, keys] of Object.entries(locales)) {
  if (lng === REFERENCE) continue;
  for (const key of Object.keys(ref)) {
    if (!(key in keys)) problems.push(`[${lng}] missing key: ${key}`);
    else if (placeholders(ref[key]) !== placeholders(keys[key])) {
      problems.push(
        `[${lng}] placeholder mismatch in ${key}: {${placeholders(ref[key])}} vs {${placeholders(keys[key])}}`,
      );
    }
  }
  for (const key of Object.keys(keys)) {
    if (!(key in ref)) problems.push(`[${lng}] extra key not in ${REFERENCE}: ${key}`);
  }
  for (const [key, value] of Object.entries(keys)) {
    if (!value.trim()) problems.push(`[${lng}] empty translation: ${key}`);
  }
}

const refBase = new Set(Object.keys(ref).map((k) => k.replace(PLURAL, '')));
const used = new Set();
for (const file of walk(srcDir)) {
  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(/\bt\(\s*'([a-zA-Z0-9_.-]+)'/g)) used.add(m[1]);
}
for (const key of [...used].sort()) {
  if (!(key in ref) && !refBase.has(key))
    problems.push(`[code] key used but not defined in ${REFERENCE}: ${key}`);
}

// 4. every API error code thrown by the server has a client translation
const serverDir = path.join(root, 'server/src');
const codes = new Set(['NETWORK_ERROR', 'UNKNOWN']);
for (const file of walk(serverDir)) {
  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(/ApiError\(\s*\d+,\s*'([A-Z_]+)'/g)) codes.add(m[1]);
  // petResourceRouter({ ..., code: 'MEDICATION' }) -> MEDICATION_NOT_FOUND
  for (const m of code.matchAll(/code:\s*'([A-Z_]+)'(?!,\s*message)/g))
    codes.add(`${m[1]}_NOT_FOUND`);
  // res.json({ error: { code: 'INVALID_JSON', message } })
  for (const m of code.matchAll(/code:\s*'([A-Z_]+)',\s*message/g)) codes.add(m[1]);
}
for (const code of [...codes].sort()) {
  if (!(`errors.${code}` in ref))
    problems.push(`[server] error code without translation: errors.${code}`);
}

if (problems.length) {
  console.error(
    `i18n check failed with ${problems.length} problem(s):\n  ${problems.join('\n  ')}`,
  );
  process.exit(1);
}
console.log(
  `i18n OK: ${Object.keys(locales).join(', ')} · ${Object.keys(ref).length} keys · ${used.size} literal keys used in code`,
);
