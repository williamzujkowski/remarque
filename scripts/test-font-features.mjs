#!/usr/bin/env node
/*
 * Font-feature check fixtures (issue #124).
 *   1. fonts/features.json is fresh: one entry per @font-face file in
 *      fonts.css, each sha256 matching the shipped woff2 (re-subsetting a
 *      font without rerunning scripts/font-features.py fails here).
 *   2. scripts/lib/font-features.mjs statuses on small fixtures.
 *   3. remarque-audit end to end: a consumer stylesheet asking a face for
 *      small caps it lacks fails; the same request passes once a consumer
 *      manifest says the face has them.
 * Run: node scripts/test-font-features.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkFontFeatures } from './lib/font-features.mjs';

let bad = 0;
function expect(label, cond, detail = '') {
  console.log(`${cond ? '✓' : '✗'} ${label}${cond ? '' : ` — ${detail}`}`);
  if (!cond) bad++;
}

// ── 1. manifest freshness ────────────────────────────────────────────────
const manifest = JSON.parse(readFileSync('fonts/features.json', 'utf8'));
const files = Object.fromEntries(Object.values(manifest.families).flatMap((f) => Object.entries(f.files)));
const faces = [...readFileSync('fonts.css', 'utf8').matchAll(/url\("fonts\/([^"]+)"\)/g)].map((m) => m[1]);
for (const f of faces) {
  const sha = createHash('sha256').update(readFileSync(join('fonts', f))).digest('hex');
  expect(`fonts/features.json covers ${f} at its current sha256`, files[f]?.sha256 === sha, files[f] ? 'stale: run python3 scripts/font-features.py' : 'missing entry');
}
expect('every manifest file is a shipped @font-face', Object.keys(files).every((f) => faces.includes(f)), Object.keys(files).join(', '));
for (const [fam, e] of Object.entries(manifest.families)) {
  expect(`${fam} declares its default figures`, ['lining', 'oldstyle'].includes(e.figures?.style) && ['proportional', 'tabular'].includes(e.figures?.spacing));
}

// ── 2. statuses ──────────────────────────────────────────────────────────
const stacks = {
  '--font-body': '"Inter", sans-serif',
  '--font-display': '"Newsreader", serif',
  '--font-mono': '"JetBrains Mono", monospace',
};
const statusOf = (css, tag) => checkFontFeatures(css, manifest, stacks).filter((r) => r.tag === tag).map((r) => r.status);

expect('small caps on JetBrains Mono: missing',
  statusOf('.a { font-family: var(--font-mono); font-variant-caps: all-small-caps; }', 'smcp')[0] === 'missing');
expect('the same rule marked conditional: conditional, not missing',
  statusOf('.a { /* remarque-feature: conditional */ font-family: var(--font-mono); font-variant-caps: all-small-caps; }', 'smcp')[0] === 'conditional');
expect('oldstyle-nums with no font-family is checked against --font-body (Inter): missing',
  statusOf('.a { font-variant-numeric: oldstyle-nums; }', 'onum')[0] === 'missing');
expect('lining-nums on Inter is satisfied by its default lining figures',
  statusOf('.a { font-variant-numeric: lining-nums; }', 'lnum')[0] === 'ok');
expect('tabular-nums on JetBrains Mono is satisfied by its tabular default',
  statusOf('.a { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }', 'tnum')[0] === 'ok');
expect('tabular-nums on Inter is satisfied by its tnum feature',
  statusOf('.a { font-variant-numeric: tabular-nums; }', 'tnum')[0] === 'ok');
expect('font-feature-settings "onum" on Newsreader: missing; "liga" on Newsreader: ok',
  statusOf('.a { font-family: var(--font-display); font-feature-settings: "onum" 1, "liga" 1; }', 'onum')[0] === 'missing' &&
  statusOf('.a { font-family: var(--font-display); font-feature-settings: "onum" 1, "liga" 1; }', 'liga')[0] === 'ok');
expect('a feature turned off ("smcp" 0) is not a request',
  statusOf('.a { font-family: var(--font-mono); font-feature-settings: "smcp" 0; }', 'smcp').length === 0);
expect('a face missing from the manifest: unverifiable, never a failure',
  statusOf('.a { font-family: "Source Serif 4", serif; font-variant-numeric: oldstyle-nums; }', 'onum')[0] === 'unverifiable');
expect('rules nested in @media are checked',
  statusOf('@media (min-width: 40rem) { .a { font-family: var(--font-mono); font-variant-caps: small-caps; } }', 'smcp')[0] === 'missing');

// ── 3. remarque-audit end to end ─────────────────────────────────────────
const dir = mkdtempSync(join(tmpdir(), 'remarque-font-features-'));
mkdirSync(join(dir, 'src'));
writeFileSync(join(dir, 'src', 'site.css'), '.kicker {\n  font-family: var(--font-mono);\n  font-variant-caps: all-small-caps;\n}\n');
const audit = (...extra) => {
  try {
    return { code: 0, json: JSON.parse(execFileSync('node', ['scripts/audit.mjs', '--src', join(dir, 'src'), '--json', ...extra], { encoding: 'utf8' })) };
  } catch (e) {
    return { code: e.status, json: JSON.parse(e.stdout) };
  }
};
const red = audit();
expect('audit fails a consumer rule asking JetBrains Mono for small caps', red.code === 1 && red.json.failures.some((f) => /site\.css:1 \.kicker.*smcp\+c2sc/.test(f)), JSON.stringify(red.json.failures));
expect('…and records it in report.fontFeatures', red.json.fontFeatures.some((r) => r.status === 'missing' && r.tag === 'smcp'));
const consumer = join(dir, 'features.json');
writeFileSync(consumer, JSON.stringify({ families: { 'JetBrains Mono': { figures: { style: 'lining', spacing: 'tabular' }, files: { 'x.woff2': { features: ['smcp', 'c2sc'] } } } } }));
const green = audit('--font-features', consumer);
expect('a consumer manifest that gives the face smcp+c2sc clears it', green.code === 0 && green.json.passed === true, JSON.stringify(green.json.failures));

// A consumer palette that sets no --font-* (fonts come from elsewhere,
// e.g. Astro's Fonts API) must not be checked against the package's faces.
const pkgPalette = readFileSync('tokens-palette.css', 'utf8');
const noFonts = join(dir, 'no-fonts.css');
writeFileSync(noFonts, pkgPalette.replace(/^\s*--font-(display|body|mono):[^;]*;\n/gm, ''));
const unknown = audit('--palette', noFonts);
expect('a consumer palette without --font-* reports requests unverifiable, not failed (0.31.1)',
  unknown.code === 0 && unknown.json.fontFeatures.some((r) => r.status === 'unverifiable' && r.tag === 'smcp'), JSON.stringify(unknown.json.failures));
const withMono = join(dir, 'with-mono.css');
writeFileSync(withMono, pkgPalette.replace(/--font-mono:[^;]*;/, '--font-mono: "JetBrains Mono", monospace;'));
expect('a consumer palette that declares JetBrains Mono still fails the synthesized small caps',
  audit('--palette', withMono).code === 1);

if (bad) { console.error(`\ntest-font-features FAILED — ${bad} check(s)`); process.exit(1); }
console.log('\ntest-font-features passed ✓');
