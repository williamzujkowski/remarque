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

/* ── Build the corpus from the dataset's counterpart field ─────────
 * (authoritative pairing metadata, dataset 0.2.0+ — replaced the
 * name-stem heuristic this test originally shipped with). Every light
 * theme that declares a counterpart yields one pair. */

const pairs = [];
for (const t of index.themes || []) {
  if (!t.isDark && typeof t.counterpart === 'string') pairs.push([t.slug, t.counterpart]);
}
if (!pairs.length) {
  console.error('no counterpart pairs in the installed dataset — is the devDependency older than 0.2.0?');
  process.exit(1);
}
console.log(`corpus: ${index.themes.length} themes, ${pairs.length} counterpart-paired light themes`);

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

/* ── Counterpart default: --dark is optional when the dataset pairs ── */

// Omitting --dark uses the light theme's counterpart.
{
  const [lightSlug, darkSlug] = pairs.find(([l]) => l === 'remarque-light') || pairs[0];
  const r = run(['scripts/theme.mjs', lightSlug]);
  expect(`omitted --dark defaults to counterpart (${lightSlug} → ${darkSlug})`, r.code === 0 && r.stdout.includes(`dark = "${darkSlug}"`), r.code !== 0 ? r.stderr.trim().slice(0, 200) : 'counterpart slug missing from provenance header');
}

// A light theme without a counterpart still requires --dark explicitly.
{
  const unpaired = (index.themes || []).find((t) => !t.isDark && t.counterpart === undefined);
  if (unpaired) {
    const r = run(['scripts/theme.mjs', unpaired.slug]);
    expect(`unpaired light theme (${unpaired.slug}) without --dark is rejected (nonzero exit)`, r.code !== 0, `exit ${r.code}`);
  }
}

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

/* ── --scope (remarque-tokens/deck, issue #56) ─────────────────────── */

{
  const [lightSlug, darkSlug] = pairs[0];

  // Scoped emission uses [data-palette="name"] / [data-palette="name"][data-theme="dark"]
  // instead of :root / [data-theme="dark"] — and nothing else about the
  // shape changes.
  const scoped = run(['scripts/theme.mjs', lightSlug, '--dark', darkSlug, '--scope', 'my-scope']);
  expect('scoped run exits 0', scoped.code === 0, scoped.stderr.trim().slice(0, 200));
  expect(
    'scoped output has a [data-palette="my-scope"] block (not bare :root)',
    /\[data-palette="my-scope"\]\s*{/.test(scoped.stdout) && !/(^|\n)\s*:root\s*{/.test(scoped.stdout),
    scoped.stdout.slice(0, 200)
  );
  expect(
    'scoped output has a [data-palette="my-scope"][data-theme="dark"] block',
    /\[data-palette="my-scope"\]\[data-theme="dark"\]\s*{/.test(scoped.stdout),
    scoped.stdout.slice(0, 200)
  );

  // Self-verify runs on the derived [L,C,H] values before the selector is
  // ever chosen — scoping must not change a single derived value. Proven
  // directly: strip the two files down to their declaration bodies (drop
  // the provenance comment header and the selector lines) and diff.
  const unscoped = run(['scripts/theme.mjs', lightSlug, '--dark', darkSlug]);
  const declsOnly = (css) => css.replace(/\/\*[\s\S]*?\*\//, '').replace(/^\s*[^\s{][^{]*{\s*$/gm, '').trim();
  expect(
    'scoped output declares byte-identical token values to the unscoped output (only the selector differs)',
    declsOnly(scoped.stdout) === declsOnly(unscoped.stdout),
    'declaration bodies diverged between scoped and unscoped emission'
  );

  // The scoped output is directly auditable with remarque-audit (the
  // isLightRoot fix in scripts/lib/css-tokens.mjs — see REMARQUE.md
  // "Palette Deck") — no unscoped-first workaround needed.
  const scopedFile = join(dir, 'my-scope.css');
  writeFileSync(scopedFile, scoped.stdout);
  const auditedScoped = run(['scripts/audit.mjs', '--palette', scopedFile, '--src', srcDir]);
  expect(
    'remarque-audit passes directly against --scope output',
    auditedScoped.code === 0,
    auditedScoped.stdout.split('\n').filter((l) => l.includes('✗')).join(' | ')
  );

  // --scope name validation mirrors the slug grammar (it lands in a CSS
  // attribute selector — same "sanitize like a slug" bar as light/dark).
  const badScopes = ['Bad Name', 'has space', 'UPPER', '', 'quote"break', 'bracket]break', 'semi;colon'];
  for (const bad of badScopes) {
    const r = run(['scripts/theme.mjs', lightSlug, '--dark', darkSlug, '--scope', bad]);
    expect(`invalid --scope "${bad}" is rejected (nonzero exit)`, r.code !== 0, `exit ${r.code}`);
  }
  // A CSS-injection-shaped scope name never reaches the output at all.
  {
    const hostile = 'x"];body{color:red}[x="';
    const r = run(['scripts/theme.mjs', lightSlug, '--dark', darkSlug, '--scope', hostile]);
    expect('CSS-injection-shaped --scope is rejected before emission', r.code !== 0, `exit ${r.code}`);
  }
}

if (bad) {
  console.error(`\ntheme fixture tests FAILED — ${bad} problem(s)\n`);
  process.exit(1);
}
console.log('\ntheme fixture tests passed ✓\n');
