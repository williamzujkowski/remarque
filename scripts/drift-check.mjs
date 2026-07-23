#!/usr/bin/env node
/*
 * remarque-drift — token drift check for consumers of remarque-tokens.
 *
 *   node scripts/drift-check.mjs --css-file <path> --package-dir <dir> [--json]
 *   npx remarque-drift --css-file src/styles/global.css --package-dir .
 *
 * Compares a consumer's stylesheet against the INSTALLED remarque-tokens
 * package (node_modules/remarque-tokens under --package-dir), using the
 * package's own generated tokens.json as the source of truth. Reuses
 * scripts/lib/css-tokens.mjs (same brace-aware parser as audit.mjs /
 * tokens-json.mjs) rather than a third CSS parser.
 *
 * Classification (see REMARQUE.md "Token Tiers"):
 *
 *   (a) CORE-tier token redeclared with a DIFFERENT value:
 *         - FAIL (exit 1) — undocumented core-tier override. The site has
 *           forked, by definition.
 *         - WARN — if a DESIGN-DEVIATIONS.md or DESIGN-NOTES.md in the
 *           consumer mentions the token name, the fork is a ratified,
 *           documented deviation; still surfaced, not a build failure.
 *   (b) PALETTE-tier token redeclared with a different value:
 *         - INFO — sanctioned personalization. Listed, not warned.
 *   (c) CORE-tier token used via var(--x) but never declared anywhere in
 *       the consumer's stylesheet: no-op. It resolves from the package
 *       import at build time; there is nothing to compare.
 *
 * Exit code: 1 iff there is at least one undocumented (FAIL) core-tier
 * mismatch. WARN and INFO never fail the build.
 *
 * --json: suppresses all human console output and emits ONE JSON document
 * to stdout instead (exit codes unchanged) — records mirror the FAIL/
 * WARN/INFO classification above. Shape documented in AGENT_RULES.md
 * ("Machine-Readable Output — remarque-drift --json").
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { extractBlocks, declsOf, isLightRoot, isDarkBlock, resolveSide, darkOverridesOf } from './lib/css-tokens.mjs';

const args = process.argv.slice(2);
function argOf(flag, dflt) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
}

const CSS_FILE = argOf('--css-file', null);
const PACKAGE_DIR = resolve(argOf('--package-dir', '.'));
const JSON_MODE = args.includes('--json');

if (!CSS_FILE) {
  console.error('usage: drift-check.mjs --css-file <path> --package-dir <dir>');
  process.exit(2);
}
if (!existsSync(CSS_FILE)) {
  console.error(`consumer stylesheet not found: ${CSS_FILE}`);
  process.exit(2);
}

const PKG_ROOT = join(PACKAGE_DIR, 'node_modules', 'remarque-tokens');
const PKG_JSON = join(PKG_ROOT, 'package.json');
const TOKENS_JSON = join(PKG_ROOT, 'tokens.json');

if (!existsSync(PKG_JSON) || !existsSync(TOKENS_JSON)) {
  console.error(
    `remarque-tokens not found under ${PACKAGE_DIR}/node_modules — ` +
      `pass --package-dir pointing at the directory containing node_modules/remarque-tokens`
  );
  process.exit(2);
}

const installedVersion = JSON.parse(readFileSync(PKG_JSON, 'utf8')).version;
const tokens = JSON.parse(readFileSync(TOKENS_JSON, 'utf8'));

/* ── Deviation-doc lookup ──────────────────────────────────────────
 * Accepts either filename (flagship uses DESIGN-DEVIATIONS.md; tsundoku
 * uses DESIGN-NOTES.md — both are "this site's documented departures"
 * docs, just named differently by each consumer). Searched in
 * --package-dir, the consumer's cwd, and every directory between the
 * stylesheet and the filesystem/git root, so it's found regardless of
 * which directory happens to hold node_modules vs the doc. */
const DEVIATION_DOC_NAMES = ['DESIGN-DEVIATIONS.md', 'DESIGN-NOTES.md'];

function candidateDirs(cssFile, packageDir) {
  const dirs = [packageDir, resolve('.')];
  let dir = resolve(dirname(cssFile));
  for (let i = 0; i < 8; i++) {
    dirs.push(dir);
    if (existsSync(join(dir, '.git'))) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return [...new Set(dirs)];
}

function findDeviationDoc(cssFile, packageDir) {
  for (const dir of candidateDirs(cssFile, packageDir)) {
    for (const name of DEVIATION_DOC_NAMES) {
      const p = join(dir, name);
      if (existsSync(p)) return p;
    }
  }
  return null;
}

const deviationDocPath = findDeviationDoc(CSS_FILE, PACKAGE_DIR);
const deviationDocText = deviationDocPath ? readFileSync(deviationDocPath, 'utf8') : '';

function isDocumented(tokenName) {
  if (!deviationDocPath) return false;
  return deviationDocText.includes(`--${tokenName}`) || deviationDocText.includes(tokenName);
}

/* ── Parse the consumer stylesheet ─────────────────────────────────── */

const blocks = extractBlocks(readFileSync(CSS_FILE, 'utf8'));
// resolveSide/darkOverridesOf (issue #95) — a consumer stylesheet may
// declare an override token via light-dark() as well as (or instead of)
// the conventional two-block form; both must classify identically.
const rawLightRoot = declsOf(blocks, isLightRoot);
const rawDarkBlock = declsOf(blocks, isDarkBlock);
const lightDecls = resolveSide(rawLightRoot, 'light');
const darkOverrides = darkOverridesOf(rawLightRoot, rawDarkBlock);

const norm = (v) => String(v).trim().replace(/\s+/g, ' ');

/* ── Classify ───────────────────────────────────────────────────────── */

const fails = [];
const warns = [];
const infos = [];

for (const [name, tok] of Object.entries(tokens.core || {})) {
  const canonical = norm(tok.$value);
  const declaredLight = Object.prototype.hasOwnProperty.call(lightDecls, name) ? lightDecls[name] : undefined;
  const declaredDark = Object.prototype.hasOwnProperty.call(darkOverrides, name) ? darkOverrides[name] : undefined;
  if (declaredLight === undefined && declaredDark === undefined) continue; // (c) no-op — resolves from the package import

  const mismatches = [];
  if (declaredLight !== undefined && norm(declaredLight) !== canonical) mismatches.push({ theme: 'light', value: declaredLight });
  if (declaredDark !== undefined && norm(declaredDark) !== canonical) mismatches.push({ theme: 'dark', value: declaredDark });
  if (mismatches.length === 0) continue; // declared but byte-identical to core — harmless duplicate, not a fork

  const diffText = mismatches.map((m) => `${m.theme}: consumer defines "${m.value}"`).join('; ');
  const entry = { name, canonical: tok.$value, mismatches };
  if (isDocumented(name)) {
    entry.doc = deviationDocPath;
    warns.push(entry);
  } else {
    fails.push(entry);
  }
  void diffText;
}

for (const [name, tok] of Object.entries(tokens.palette || {})) {
  const canonicalLight = norm(tok.light?.$value);
  const canonicalDark = norm(tok.dark?.$value ?? tok.light?.$value);
  const declaredLight = Object.prototype.hasOwnProperty.call(lightDecls, name) ? lightDecls[name] : undefined;
  const declaredDarkRaw = Object.prototype.hasOwnProperty.call(darkOverrides, name) ? darkOverrides[name] : undefined;
  if (declaredLight === undefined && declaredDarkRaw === undefined) continue; // not touched by the consumer at all

  // CSS cascade: an undeclared dark value inherits the consumer's own light value.
  const effectiveDark = declaredDarkRaw !== undefined ? declaredDarkRaw : declaredLight;

  const diffs = [];
  if (declaredLight !== undefined && norm(declaredLight) !== canonicalLight) diffs.push({ theme: 'light', value: declaredLight });
  if (effectiveDark !== undefined && norm(effectiveDark) !== canonicalDark) diffs.push({ theme: 'dark', value: effectiveDark });
  if (diffs.length === 0) continue; // declared, but matches the package default — no divergence to report

  infos.push({ name, canonicalLight: tok.light?.$value, canonicalDark: tok.dark?.$value ?? tok.light?.$value, diffs });
}

/* ── Report ─────────────────────────────────────────────────────────── */

if (JSON_MODE) {
  // Flatten the internal per-token fails/warns/infos (each may bundle a
  // light+dark mismatch) into one record per theme mismatch — the FAIL/
  // WARN/INFO records the human report prints one line per, above.
  const fail = fails.flatMap((f) => f.mismatches.map((m) => ({ name: f.name, theme: m.theme, canonical: f.canonical, value: m.value })));
  const warn = warns.flatMap((w) => w.mismatches.map((m) => ({ name: w.name, theme: m.theme, canonical: w.canonical, value: m.value, doc: w.doc })));
  const info = infos.flatMap((i) => i.diffs.map((d) => ({ name: i.name, theme: d.theme, canonical: d.theme === 'light' ? i.canonicalLight : i.canonicalDark, value: d.value })));
  console.log(JSON.stringify({
    cssFile: CSS_FILE,
    packageDir: PKG_ROOT,
    installedVersion,
    deviationDoc: deviationDocPath,
    passed: fails.length === 0,
    fail,
    warn,
    info,
    summary: { fail: fails.length, warn: warns.length, info: infos.length },
  }, null, 2));
  process.exit(fails.length ? 1 : 0);
}

console.log('remarque-drift — token drift check');
console.log(`  consumer stylesheet: ${CSS_FILE}`);
console.log(`  installed remarque-tokens: ${installedVersion} (${PKG_ROOT})`);
console.log(`  deviation doc: ${deviationDocPath || '(none found — DESIGN-DEVIATIONS.md / DESIGN-NOTES.md)'}`);

if (fails.length) {
  console.log('\nFAIL — undocumented core-tier override(s) (this consumer has forked Remarque):');
  for (const f of fails) {
    for (const m of f.mismatches) {
      console.log(`  ✗ --${f.name} (${m.theme}): core ships "${f.canonical}", consumer defines "${m.value}"`);
    }
    console.log(`      fix: revert to the core value, or document the deviation in DESIGN-DEVIATIONS.md / DESIGN-NOTES.md and mention "--${f.name}"`);
  }
}

if (warns.length) {
  console.log('\nWARN — documented core-tier deviation(s) (ratified, not a build failure):');
  for (const w of warns) {
    for (const m of w.mismatches) {
      console.log(`  ⚠ --${w.name} (${m.theme}): core ships "${w.canonical}", consumer defines "${m.value}" — see ${w.doc}`);
    }
  }
}

if (infos.length) {
  console.log('\nINFO — palette-tier divergence(s) (sanctioned personalization):');
  for (const i of infos) {
    for (const d of i.diffs) {
      const canonical = d.theme === 'light' ? i.canonicalLight : i.canonicalDark;
      console.log(`  ℹ --${i.name} (${d.theme}): package default "${canonical}", consumer defines "${d.value}"`);
    }
  }
}

console.log(`\nSummary: ${fails.length} FAIL, ${warns.length} WARN, ${infos.length} INFO\n`);

process.exit(fails.length ? 1 : 0);
