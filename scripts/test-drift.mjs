#!/usr/bin/env node
/*
 * Fixture tests for scripts/drift-check.mjs's classification rules.
 * Run: node scripts/test-drift.mjs (wired into deploy.yml)
 *
 * Builds a minimal fake `node_modules/remarque-tokens` (package.json +
 * tokens.json) per case so the fixtures are independent of this repo's
 * own, evolving token set, then exercises the engine against a variety
 * of consumer stylesheets and deviation-doc combinations. Exit 1 on any
 * unexpected outcome.
 */

import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FAKE_TOKENS = {
  $extensions: { remarque: { version: '9.9.9', tiers: {} } },
  core: {
    'text-body': { $value: '1.0625rem', $type: 'dimension' },
    'space-4': { $value: '1rem', $type: 'dimension' },
  },
  palette: {
    'color-accent': {
      $type: 'color',
      light: { $value: 'oklch(0.50 0.14 250)' },
      dark: { $value: 'oklch(0.68 0.12 250)' },
    },
  },
};

function makePackageDir(root) {
  const pkgDir = join(root, 'node_modules', 'remarque-tokens');
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: 'remarque-tokens', version: '9.9.9' }));
  writeFileSync(join(pkgDir, 'tokens.json'), JSON.stringify(FAKE_TOKENS, null, 2));
  return root;
}

function run(cssFile, packageDir) {
  try {
    const out = execFileSync('node', ['scripts/drift-check.mjs', '--css-file', cssFile, '--package-dir', packageDir], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || '') + (e.stderr || '') };
  }
}

let bad = 0;
function expect(label, cond, detail = '') {
  const ok = !!cond;
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : ` — ${detail}`}`);
  if (!ok) bad++;
}

/* ── Case 1: no overrides at all → clean, exit 0 ─────────────────── */
{
  const root = mkdtempSync(join(tmpdir(), 'remarque-drift-test-'));
  makePackageDir(root);
  const css = join(root, 'consumer.css');
  writeFileSync(css, `:root {\n  --color-fg: oklch(0.1 0 0);\n}`);
  const { code, out } = run(css, root);
  expect('case 1 (no token overrides): exit 0', code === 0, `exit ${code}`);
  expect('case 1: 0 FAIL, 0 WARN, 0 INFO', out.includes('Summary: 0 FAIL, 0 WARN, 0 INFO'), out);
  rmSync(root, { recursive: true, force: true });
}

/* ── Case 2: undocumented core override → FAIL, exit 1 ───────────── */
{
  const root = mkdtempSync(join(tmpdir(), 'remarque-drift-test-'));
  makePackageDir(root);
  const css = join(root, 'consumer.css');
  writeFileSync(css, `:root {\n  --text-body: 2rem;\n}`);
  const { code, out } = run(css, root);
  expect('case 2 (undocumented core override): exit 1', code === 1, `exit ${code}`);
  expect('case 2: reports FAIL for --text-body', out.includes('FAIL') && out.includes('--text-body'), out);
  rmSync(root, { recursive: true, force: true });
}

/* ── Case 3: documented core override (DESIGN-DEVIATIONS.md) → WARN, exit 0 */
{
  const root = mkdtempSync(join(tmpdir(), 'remarque-drift-test-'));
  makePackageDir(root);
  const css = join(root, 'consumer.css');
  writeFileSync(css, `:root {\n  --text-body: 2rem;\n}`);
  writeFileSync(join(root, 'DESIGN-DEVIATIONS.md'), `We override \`--text-body\` deliberately. See rationale.`);
  const { code, out } = run(css, root);
  expect('case 3 (documented via DESIGN-DEVIATIONS.md): exit 0', code === 0, `exit ${code}`);
  expect('case 3: reports WARN, not FAIL, for --text-body', out.includes('WARN') && !out.includes('FAIL —'), out);
  rmSync(root, { recursive: true, force: true });
}

/* ── Case 4: documented core override (DESIGN-NOTES.md, alt filename) → WARN */
{
  const root = mkdtempSync(join(tmpdir(), 'remarque-drift-test-'));
  makePackageDir(root);
  const css = join(root, 'consumer.css');
  writeFileSync(css, `:root {\n  --text-body: 2rem;\n}`);
  writeFileSync(join(root, 'DESIGN-NOTES.md'), `Deliberate departure: --text-body is intentionally larger here.`);
  const { code, out } = run(css, root);
  expect('case 4 (documented via DESIGN-NOTES.md, alt filename): exit 0', code === 0, `exit ${code}`);
  expect('case 4: reports WARN, not FAIL, for --text-body', out.includes('WARN') && !out.includes('FAIL —'), out);
  rmSync(root, { recursive: true, force: true });
}

/* ── Case 5: a deviation doc exists but does NOT mention the token → still FAIL (fail-closed) */
{
  const root = mkdtempSync(join(tmpdir(), 'remarque-drift-test-'));
  makePackageDir(root);
  const css = join(root, 'consumer.css');
  writeFileSync(css, `:root {\n  --text-body: 2rem;\n}`);
  writeFileSync(join(root, 'DESIGN-DEVIATIONS.md'), `This document exists but never names the token in question.`);
  const { code, out } = run(css, root);
  expect('case 5 (doc exists, does not mention token): exit 1', code === 1, `exit ${code}`);
  expect('case 5: reports FAIL', out.includes('FAIL'), out);
  rmSync(root, { recursive: true, force: true });
}

/* ── Case 6: palette-tier divergence → INFO only, exit 0 ─────────── */
{
  const root = mkdtempSync(join(tmpdir(), 'remarque-drift-test-'));
  makePackageDir(root);
  const css = join(root, 'consumer.css');
  writeFileSync(css, `:root {\n  --color-accent: oklch(0.50 0.14 35);\n}`);
  const { code, out } = run(css, root);
  expect('case 6 (palette divergence): exit 0', code === 0, `exit ${code}`);
  expect(
    'case 6: reports INFO for --color-accent, no FAIL/WARN section',
    out.includes('INFO') && out.includes('--color-accent') && !out.includes('FAIL —') && !out.includes('WARN —'),
    out
  );
  rmSync(root, { recursive: true, force: true });
}

/* ── Case 7: core token consumed via var() but never declared → no-op */
{
  const root = mkdtempSync(join(tmpdir(), 'remarque-drift-test-'));
  makePackageDir(root);
  const css = join(root, 'consumer.css');
  writeFileSync(css, `.prose { font-size: var(--text-body); padding: var(--space-4); }`);
  const { code, out } = run(css, root);
  expect('case 7 (var()-only consumption, never declared): exit 0', code === 0, `exit ${code}`);
  expect('case 7: 0 FAIL, 0 WARN, 0 INFO (no-op)', out.includes('Summary: 0 FAIL, 0 WARN, 0 INFO'), out);
  rmSync(root, { recursive: true, force: true });
}

/* ── Case 8: declared identically to core (harmless duplicate) → no-op */
{
  const root = mkdtempSync(join(tmpdir(), 'remarque-drift-test-'));
  makePackageDir(root);
  const css = join(root, 'consumer.css');
  writeFileSync(css, `:root {\n  --text-body: 1.0625rem;\n}`);
  const { code, out } = run(css, root);
  expect('case 8 (byte-identical redeclaration): exit 0', code === 0, `exit ${code}`);
  expect('case 8: 0 FAIL, 0 WARN, 0 INFO (identical value is not a fork)', out.includes('Summary: 0 FAIL, 0 WARN, 0 INFO'), out);
  rmSync(root, { recursive: true, force: true });
}

/* ── Case 9: installed package version is printed ────────────────── */
{
  const root = mkdtempSync(join(tmpdir(), 'remarque-drift-test-'));
  makePackageDir(root);
  const css = join(root, 'consumer.css');
  writeFileSync(css, `:root { --color-fg: oklch(0.1 0 0); }`);
  const { out } = run(css, root);
  expect('case 9: prints installed package version', out.includes('installed remarque-tokens: 9.9.9'), out);
  rmSync(root, { recursive: true, force: true });
}

/* ── --json fixture coverage (issue #98) ─────────────────────────────
   Case 10: clean stylesheet → passed:true, empty fail/warn/info, valid
   JSON-only stdout. Case 11: undocumented core override (mirrors case 2)
   → passed:false with the offending token present in `fail`, same exit
   code (1) as the human-mode run. */
function runJson(cssFile, packageDir) {
  try {
    const out = execFileSync('node', ['scripts/drift-check.mjs', '--css-file', cssFile, '--package-dir', packageDir, '--json'], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || '') };
  }
}

{
  const root = mkdtempSync(join(tmpdir(), 'remarque-drift-test-'));
  makePackageDir(root);
  const css = join(root, 'consumer.css');
  writeFileSync(css, `:root {\n  --color-fg: oklch(0.1 0 0);\n}`);
  const { code, out } = runJson(css, root);
  expect('case 10 (--json, no overrides): exit 0', code === 0, `exit ${code}`);
  expect('case 10: stdout is ONLY the JSON document', out.trim().startsWith('{') && out.trim().endsWith('}'), out);
  let report;
  try {
    report = JSON.parse(out);
    expect('case 10: valid JSON', true);
  } catch {
    expect('case 10: valid JSON', false, out);
    report = {};
  }
  expect(
    'case 10: report has cssFile/installedVersion/passed/fail/warn/info/summary',
    report.cssFile === css && report.installedVersion === '9.9.9' && report.passed === true &&
      Array.isArray(report.fail) && Array.isArray(report.warn) && Array.isArray(report.info) &&
      typeof report.summary === 'object',
    JSON.stringify(report)
  );
  expect('case 10: 0 FAIL, 0 WARN, 0 INFO', report.fail?.length === 0 && report.warn?.length === 0 && report.info?.length === 0);
  rmSync(root, { recursive: true, force: true });
}

{
  const root = mkdtempSync(join(tmpdir(), 'remarque-drift-test-'));
  makePackageDir(root);
  const css = join(root, 'consumer.css');
  writeFileSync(css, `:root {\n  --text-body: 2rem;\n}`);
  const { code, out } = runJson(css, root);
  expect('case 11 (--json, undocumented core override): exit 1', code === 1, `exit ${code}`);
  const report = JSON.parse(out);
  expect('case 11: report.passed === false', report.passed === false);
  expect(
    'case 11: report.fail[] contains the offending --text-body record',
    Array.isArray(report.fail) && report.fail.some((f) => f.name === 'text-body' && f.theme === 'light' && f.canonical === '1.0625rem' && f.value === '2rem'),
    JSON.stringify(report)
  );
  rmSync(root, { recursive: true, force: true });
}

if (bad) {
  console.error(`\ndrift-check fixture tests FAILED — ${bad} problem(s)\n`);
  process.exit(1);
}
console.log('\ndrift-check fixture tests passed ✓\n');
