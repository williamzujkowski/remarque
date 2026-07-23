#!/usr/bin/env node
/*
 * remarque palette-golden — proves the shipped, hand-authored
 * tokens-palette.css cannot drift perceptibly from the upstream
 * remarque-light/remarque-dark themes it exists to serialize (#76).
 *
 * The split: remarque-light/remarque-dark (in the pinned
 * @williamzujkowski/oklch-terminal-themes devDependency) are the source
 * of truth for the DEFAULT PALETTE'S IDENTITY — derived here through the
 * same scripts/theme.mjs bridge every other consumer uses, keep-if-
 * passing semantics and all. tokens-palette.css is that identity's
 * human-authored SERIALIZATION: designed round numbers, hand comments,
 * a stable file every downstream site imports — but it must stay
 * perceptually identical to what the bridge derives. This script is
 * that binding. It is a CI gate, not a generator: it never writes CSS,
 * and it never loosens on failure — a breach means either the upstream
 * themes changed or tokens-palette.css did; reconcile one against the
 * other, don't move the threshold.
 *
 * Two independent checks:
 *   1. GOLDEN — every --color-* token the bridge emits, in both themes,
 *      compared hand vs. derived via CIEDE2000 (culori's
 *      differenceCiede2000; ΔE2000 is the perceptual-difference metric,
 *      not hand-rolled math). ΔE ≤ 2.0 (roughly the "just noticeable
 *      difference" ceiling) or the gate fails. weight-display must match
 *      exactly (it isn't a color, so it isn't part of the ΔE table).
 *      The full per-token table prints unconditionally — outliers above
 *      1.0 stay visible even when they still pass, so drift can't creep
 *      silently toward the threshold release over release.
 *   2. MIRROR — site/src/styles/globals.css's explicit
 *      [data-theme="light"] block is a known drift trap (#76): every
 *      --color-* value declared there must be string-identical (after
 *      whitespace normalization) to tokens-palette.css's :root light
 *      value. This catches the file going stale even when the palette
 *      itself hasn't drifted from the themes.
 *
 *   node scripts/palette-golden.mjs
 */

import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { differenceCiede2000 } from 'culori';
import { extractBlocks, declsOf, isLightRoot, isDarkBlock } from './lib/css-tokens.mjs';

const DELTA_E_MAX = 2.0;
const LIGHT_SLUG = 'remarque-light';
const DARK_SLUG = 'remarque-dark'; // also remarque-light's dataset counterpart

let failures = 0;
function fail(msg) {
  failures++;
  console.error(`  ✗ ${msg}`);
}

/* ── Derive the reference palette from the pinned upstream themes ──── */

const workdir = mkdtempSync(join(tmpdir(), 'remarque-palette-golden-'));
const derivedPath = join(workdir, 'derived.css');
let derivedCss;
try {
  execFileSync('node', ['scripts/theme.mjs', LIGHT_SLUG, '--dark', DARK_SLUG, '-o', derivedPath], { stdio: 'pipe' });
  derivedCss = readFileSync(derivedPath, 'utf8');
} catch (e) {
  console.error(`could not derive the reference palette from ${LIGHT_SLUG}/${DARK_SLUG} via scripts/theme.mjs:\n${(e.stderr || e.message || '').toString().trim()}`);
  process.exit(1);
} finally {
  rmSync(workdir, { recursive: true, force: true });
}

const derivedBlocks = extractBlocks(derivedCss);
const derivedLight = declsOf(derivedBlocks, isLightRoot);
const derivedDark = { ...derivedLight, ...declsOf(derivedBlocks, isDarkBlock) };

const PALETTE = 'tokens-palette.css';
const handCss = readFileSync(PALETTE, 'utf8');
const handBlocks = extractBlocks(handCss);
const handLight = declsOf(handBlocks, isLightRoot);
const handDark = { ...handLight, ...declsOf(handBlocks, isDarkBlock) };

/* ── Resolve a token to a culori oklch color, following var() chains ── */

function resolveColor(decls, name, seen = new Set()) {
  if (seen.has(name)) return { err: `circular var() chain at --${name}` };
  seen.add(name);
  const raw = decls[name];
  if (raw === undefined) return { err: `--${name} is not defined` };
  const varRef = raw.match(/^var\(\s*--([a-z0-9-]+)\s*\)$/);
  if (varRef) return resolveColor(decls, varRef[1], seen);
  const ok = raw.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/);
  if (ok) return { color: { mode: 'oklch', l: +ok[1], c: +ok[2], h: +ok[3] }, raw };
  return { err: `--${name} has unsupported value "${raw}" (expected oklch(L C H) or var(--token))` };
}

/* ── GOLDEN: ΔE2000 per token, both themes — table always printed ──── */

const de2000 = differenceCiede2000();
// The token set under test is whatever the bridge emits — that's the
// identity contract. Hand-only convenience aliases (--color-link etc.,
// pure var() re-exports of accent/accent-hover) aren't independently
// derived and are out of scope here.
const colorNames = Object.keys(derivedLight).filter((n) => n.startsWith('color-'));

console.log(`palette-golden: comparing ${colorNames.length} --color-* tokens x 2 themes against ${LIGHT_SLUG}/${DARK_SLUG} (ΔE2000 ≤ ${DELTA_E_MAX})\n`);

const rows = [];
for (const [themeName, hand, derived] of [
  ['light', handLight, derivedLight],
  ['dark', handDark, derivedDark],
]) {
  for (const name of colorNames) {
    const h = resolveColor(hand, name);
    const d = resolveColor(derived, name);
    if (h.err || d.err) {
      fail(`${themeName} --${name}: ${h.err || d.err}`);
      rows.push({ token: name, theme: themeName, hand: h.raw ?? h.err, derived: d.raw ?? d.err, de: null, pass: false });
      continue;
    }
    const de = de2000(h.color, d.color);
    const pass = de <= DELTA_E_MAX;
    if (!pass) fail(`${themeName} --${name}: ΔE2000 ${de.toFixed(3)} > ${DELTA_E_MAX} (hand ${h.raw} vs derived ${d.raw}) — either the upstream themes changed or ${PALETTE} did; reconcile, don't loosen the gate`);
    rows.push({ token: name, theme: themeName, hand: h.raw, derived: d.raw, de, pass });
  }
}

// Fixed-width table, always printed (per-token visibility on outliers > 1.0
// is a deliberate condition — drift shouldn't be able to creep silently).
const col = (s, w) => String(s).padEnd(w);
console.log(col('token', 22) + col('theme', 7) + col('hand', 24) + col('derived', 24) + col('dE2000', 9) + 'pass');
for (const r of rows) {
  const deStr = r.de === null ? 'n/a' : r.de.toFixed(3) + (r.de > 1.0 ? ' *' : '');
  console.log(col(r.token, 22) + col(r.theme, 7) + col(r.hand, 24) + col(r.derived, 24) + col(deStr, 9) + (r.pass ? '✓' : '✗'));
}
console.log('  (* marks ΔE > 1.0 — still passing at ≤ 2.0, printed so drift stays visible before it reaches the threshold)\n');

/* ── weight-display: exact match, both themes (not a color, no ΔE) ──── */

for (const [themeName, hand, derived] of [
  ['light', handLight, derivedLight],
  ['dark', handDark, derivedDark],
]) {
  const h = hand['weight-display'], d = derived['weight-display'];
  if (h === undefined || d === undefined) fail(`${themeName} --weight-display: missing in ${h === undefined ? PALETTE : 'derived output'}`);
  else if (h.trim() !== d.trim()) fail(`${themeName} --weight-display: hand "${h}" != derived "${d}"`);
  else console.log(`  ✓ ${themeName} --weight-display = ${h} (hand == derived)`);
}

/* ── MIRROR: site's explicit light block vs tokens-palette.css :root ── */

console.log(`\nsite mirror check (site/src/styles/globals.css [data-theme="light"] vs ${PALETTE} :root light)`);

const SITE_CSS = 'site/src/styles/globals.css';
const siteBlocks = extractBlocks(readFileSync(SITE_CSS, 'utf8'));
const siteLight = declsOf(siteBlocks, isLightRoot);
const norm = (v) => v.replace(/\s+/g, ' ').trim();

const siteColorNames = Object.keys(siteLight).filter((n) => n.startsWith('color-'));
let mirrorFail = 0;
for (const name of siteColorNames) {
  const siteValue = siteLight[name];
  const handValue = handLight[name];
  if (handValue === undefined) {
    fail(`site mirror: --${name} is declared in ${SITE_CSS} but not in ${PALETTE}'s :root`);
    mirrorFail++;
    continue;
  }
  if (norm(siteValue) !== norm(handValue)) {
    fail(`site mirror: --${name} = "${siteValue}" in ${SITE_CSS} but "${handValue}" in ${PALETTE} :root — the mirror has drifted, reconcile it`);
    mirrorFail++;
  }
}
if (!mirrorFail) {
  console.log(`  ✓ all ${siteColorNames.length} --color-* tokens in the site's [data-theme="light"] block match ${PALETTE} :root exactly`);
}

if (failures) {
  console.error(`\npalette-golden FAILED — ${failures} problem(s)\n`);
  process.exit(1);
}
console.log('\npalette-golden passed ✓\n');
