#!/usr/bin/env node
/*
 * Corpus + security fixture tests for scripts/theme.mjs (remarque-theme).
 * Run: node scripts/test-theme.mjs (wired into deploy.yml)
 *
 * Requires @williamzujkowski/oklch-terminal-themes installed (devDependency
 * pinned exact in package.json) — CI installs root devDependencies before
 * this step; see .github/workflows/deploy.yml.
 *
 * Corpus: every light+dark pair discoverable in the installed package's
 * index.json by name-stem (strip -dark/-light/-day/-night/-dawn/-moon/
 * -latte/-mocha/-storm/-med/-hard/-soft; a family with >=1 light and >=1
 * dark member yields the pair (first light, first dark)). For EVERY pair
 * (not a sample): derive with theme.mjs, then run the real audit.mjs
 * against the output. All must pass.
 */

import { writeFileSync, mkdirSync, mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

let bad = 0;
function expect(label, cond, detail = '') {
  const ok = !!cond;
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : ` — ${detail}`}`);
  if (!ok) bad++;
}

function run(args) {
  try {
    const out = execFileSync('node', args, { encoding: 'utf8', stdio: 'pipe' });
    return { code: 0, stdout: out, stderr: '' };
  } catch (e) {
    return { code: e.status ?? 1, stdout: e.stdout || '', stderr: e.stderr || '' };
  }
}

const req = createRequire(import.meta.url);
const PKG_SPEC = '@williamzujkowski/oklch-terminal-themes';
let indexPath;
try {
  indexPath = req.resolve(`${PKG_SPEC}/index.json`);
} catch {
  console.error(
    `${PKG_SPEC} is not installed — this test needs the root devDependency installed ` +
    `(npm install at the repo root, not just site/).`
  );
  process.exit(1);
}
const index = JSON.parse(readFileSync(indexPath, 'utf8'));

/* ── Build the corpus of light+dark pairs by name-stem ───────────── */

const SUFFIXES = ['-dark', '-light', '-day', '-night', '-dawn', '-moon', '-latte', '-mocha', '-storm', '-med', '-hard', '-soft'];
function stem(slug) {
  for (const s of SUFFIXES) if (slug.endsWith(s)) return slug.slice(0, -s.length);
  return slug;
}
const families = new Map();
for (const t of index.themes || []) {
  const st = stem(t.slug);
  if (!families.has(st)) families.set(st, { light: [], dark: [] });
  (t.isDark ? families.get(st).dark : families.get(st).light).push(t.slug);
}
const pairs = [];
for (const g of families.values()) {
  if (g.light.length && g.dark.length) pairs.push([g.light[0], g.dark[0]]);
}
console.log(`corpus: ${index.themes.length} themes, ${families.size} name-stem families, ${pairs.length} light+dark pairs`);

/* ── Corpus property test: every pair must derive AND pass the real audit */

const dir = mkdtempSync(join(tmpdir(), 'remarque-theme-test-'));
const srcDir = join(dir, 'src');
mkdirSync(srcDir, { recursive: true });

let corpusPass = 0;
const corpusFailures = [];
for (const [lightSlug, darkSlug] of pairs) {
  const out = join(dir, `${lightSlug}__${darkSlug}.css`);
  const derived = run(['scripts/theme.mjs', lightSlug, '--dark', darkSlug, '-o', out]);
  if (derived.code !== 0) {
    corpusFailures.push(`${lightSlug}/${darkSlug}: derivation failed — ${derived.stderr.trim().slice(0, 200)}`);
    continue;
  }
  const audited = run(['scripts/audit.mjs', '--palette', out, '--src', srcDir]);
  if (audited.code !== 0) {
    corpusFailures.push(`${lightSlug}/${darkSlug}: audit failed — ${audited.stdout.split('\n').filter((l) => l.includes('✗')).join(' | ')}`);
    continue;
  }
  corpusPass++;
}
expect(
  `corpus: all ${pairs.length} pairs pass remarque-audit (${corpusPass}/${pairs.length})`,
  corpusFailures.length === 0,
  corpusFailures.slice(0, 10).join('\n')
);

/* ── Security / validation fixture cases ─────────────────────────── */

// Unknown slug is rejected.
{
  const anyDark = pairs[0][1];
  const r = run(['scripts/theme.mjs', 'not-a-real-theme-slug', '--dark', anyDark]);
  expect('unknown light slug is rejected (nonzero exit)', r.code !== 0, `exit ${r.code}`);
}

// Light/dark polarity mismatch is rejected (passing a dark theme as light).
{
  const [anyLight, anyDark] = pairs[0];
  const r = run(['scripts/theme.mjs', anyDark, '--dark', anyLight]);
  expect('light/dark polarity mismatch is rejected (nonzero exit)', r.code !== 0, `exit ${r.code}`);
}

// Traversal-looking slug is rejected before any file access.
{
  const anyDark = pairs[0][1];
  const r = run(['scripts/theme.mjs', '../x', '--dark', anyDark]);
  expect('traversal-looking slug "../x" is rejected (nonzero exit)', r.code !== 0, `exit ${r.code}`);
}
{
  const anyLight = pairs[0][0];
  const r = run(['scripts/theme.mjs', anyLight, '--dark', '../../etc/passwd']);
  expect('traversal-looking --dark slug is rejected (nonzero exit)', r.code !== 0, `exit ${r.code}`);
}

/* ── Output shape: only palette-tier custom properties ────────────── */

{
  const [lightSlug, darkSlug] = pairs[0];
  const css = run(['scripts/theme.mjs', lightSlug, '--dark', darkSlug]).stdout;
  const names = [...css.matchAll(/--([a-z0-9-]+)\s*:/g)].map((m) => m[1]);
  expect('derived output declares at least one custom property', names.length > 0, css.slice(0, 200));
  const nonPaletteTier = names.filter((n) => !(n.startsWith('color-') || n === 'weight-display'));
  expect(
    'derived output contains ONLY palette-tier custom properties (--color-*, --weight-display)',
    nonPaletteTier.length === 0,
    `unexpected tokens: ${nonPaletteTier.join(', ')}`
  );
  expect('derived output has a :root block', /:root\s*{/.test(css), css.slice(0, 200));
  expect('derived output has a [data-theme="dark"] block', /\[data-theme="dark"\]\s*{/.test(css), css.slice(0, 200));
}

if (bad) {
  console.error(`\ntheme fixture tests FAILED — ${bad} problem(s)\n`);
  process.exit(1);
}
console.log('\ntheme fixture tests passed ✓\n');
