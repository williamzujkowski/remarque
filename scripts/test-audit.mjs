#!/usr/bin/env node
/*
 * Fixture tests for remarque-audit's palette parsing — both theme
 * conventions plus a must-fail case. Run: node scripts/test-audit.mjs
 * (wired into deploy.yml). Exit 1 on any unexpected outcome.
 */

import { writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'remarque-audit-test-'));
mkdirSync(join(dir, 'src'), { recursive: true });

const LIGHT = `:root {
  --color-bg: oklch(0.975 0.005 80);
  --color-bg-subtle: oklch(0.955 0.005 80);
  --color-fg: oklch(0.18 0.01 80);
  --color-fg-muted: oklch(0.43 0.015 80);
  --color-muted: oklch(0.54 0.01 80);
  --color-border: oklch(0.88 0.005 80);
  --color-border-bold: oklch(0.62 0.01 80);
  --color-surface: oklch(0.965 0.005 80);
  --color-accent: oklch(0.50 0.14 250);
  --color-accent-hover: oklch(0.42 0.11 250);
  --color-selection-bg: oklch(0.92 0.04 250);
  --color-selection-fg: var(--color-fg);
  --color-code-bg: oklch(0.945 0.005 80);
  --color-code-fg: var(--color-fg);
  --color-syntax-keyword: oklch(0.51 0.12 250);
  --color-syntax-string: oklch(0.50 0.12 145);
  --color-syntax-constant: oklch(0.51 0.105 85);
  --color-syntax-comment: oklch(0.52 0.01 80);
  --color-syntax-function: oklch(0.52 0.12 310);
  --color-syntax-type: oklch(0.50 0.085 196);
  --color-syntax-punctuation: oklch(0.52 0.01 80);
  --color-syntax-variable: oklch(0.26 0.01 80);
  --color-syntax-link: var(--color-accent);
  --color-error: oklch(0.54 0.14 25);
  --color-error-subtle: oklch(0.95 0.02 25);
  --color-success: oklch(0.51 0.12 145);
  --color-success-subtle: oklch(0.95 0.02 145);
  --color-warning: oklch(0.52 0.105 85);
  --color-warning-subtle: oklch(0.95 0.02 85);
  --color-disabled: var(--color-muted);
}`;
const DARK_DECLS = `
  --color-bg: oklch(0.16 0.01 80);
  --color-fg: oklch(0.90 0.005 80);
  --color-fg-muted: oklch(0.70 0.01 80);
  --color-muted: oklch(0.60 0.01 80);
  --color-border-bold: oklch(0.50 0.01 80);
  --color-surface: oklch(0.19 0.01 80);
  --color-accent: oklch(0.68 0.12 250);
  --color-accent-hover: oklch(0.75 0.12 250);
  --color-selection-bg: oklch(0.30 0.06 250);
  --color-selection-fg: oklch(0.92 0.005 80);
  --color-code-bg: oklch(0.20 0.005 80);
  --color-code-fg: oklch(0.88 0.005 80);
  --color-syntax-keyword: oklch(0.61 0.11 250);
  --color-syntax-string: oklch(0.60 0.11 145);
  --color-syntax-constant: oklch(0.61 0.11 84);
  --color-syntax-comment: oklch(0.60 0.005 80);
  --color-syntax-function: oklch(0.62 0.11 310);
  --color-syntax-type: oklch(0.60 0.10 195);
  --color-syntax-punctuation: oklch(0.60 0.005 80);
  --color-syntax-variable: oklch(0.82 0.005 80);
  --color-syntax-link: var(--color-accent);
  --color-error: oklch(0.64 0.12 25);
  --color-error-subtle: oklch(0.22 0.04 25);
  --color-success: oklch(0.61 0.11 145);
  --color-success-subtle: oklch(0.22 0.04 145);
  --color-warning: oklch(0.62 0.11 85);
  --color-warning-subtle: oklch(0.22 0.04 85);
  --color-disabled: var(--color-muted);
`;

const cases = [
  ['attr-convention.css', `${LIGHT}\n[data-theme="dark"] {${DARK_DECLS}}`, true],
  ['class-convention.css', `${LIGHT}\n:root.dark {${DARK_DECLS}}`, true],
  ['media-convention.css', `${LIGHT}\n@media (prefers-color-scheme: dark) { :root {${DARK_DECLS}} }`, true],
  ['leading-import.css', `@import './fonts.css';\n@charset "utf-8";\n${LIGHT}\n[data-theme="dark"] {${DARK_DECLS}}`, true],
  ['qualified-selectors.css', `${LIGHT.replace(':root {', 'html:root {')}\nhtml[data-theme="dark"] {${DARK_DECLS}}`, true],
  // Palette-deck scope convention (remarque-tokens/deck, issue #56):
  // [data-palette="name"] plays :root's role, [data-palette="name"][data-theme="dark"]
  // plays [data-theme="dark"]'s — proves the isLightRoot/PALETTE_SCOPE_LIGHT
  // addition in scripts/lib/css-tokens.mjs actually classifies scoped
  // output, so a --scope'd file is directly auditable without an
  // unscoped-first workaround. See REMARQUE.md "Palette Deck".
  ['palette-deck-convention.css', `${LIGHT.replace(':root {', '[data-palette="deck"] {')}\n[data-palette="deck"][data-theme="dark"] {${DARK_DECLS}}`, true],
  // A bare [data-palette] selector unrelated to any theme attribute must
  // NOT be misread as a dark override — mirrors the :root.dark leak test
  // just below, for the scoped convention: light fg-muted fails AAA here,
  // so if the scoped dark block's values leaked into the scoped light
  // parse, the failure would disappear.
  ['palette-deck-light-fails.css', `${LIGHT.replace(':root {', '[data-palette="deck"] {').replace('--color-fg-muted: oklch(0.43 0.015 80);', '--color-fg-muted: oklch(0.55 0.015 80);')}\n[data-palette="deck"][data-theme="dark"] {${DARK_DECLS}}`, false],
  // :root.dark must NOT pollute the light theme: light fg-muted here fails AAA,
  // so if dark values leaked into light (the old .includes(':root') bug hid
  // this), the failure would disappear. Expect FAIL for the light theme.
  ['light-fails.css', `${LIGHT.replace('--color-fg-muted: oklch(0.43 0.015 80);', '--color-fg-muted: oklch(0.55 0.015 80);')}\n:root.dark {${DARK_DECLS}}`, false],
  // A syntax slot too close to code-bg must fail — proves the 9 new
  // pairings (issue #53) are actually wired into CHECKS, not just parsed.
  ['syntax-slot-fails.css', `${LIGHT.replace('--color-syntax-comment: oklch(0.52 0.01 80);', '--color-syntax-comment: oklch(0.90 0.01 80);')}\n[data-theme="dark"] {${DARK_DECLS}}`, false],
  // A state color too close to bg/surface must fail — proves the semantic
  // state pairings (issue #26) are actually wired into CHECKS, not just
  // parsed. oklch(0.90 0.105 85) sits far too light on --color-bg
  // (oklch(0.975 0.005 80)) to hold 4.5:1.
  ['state-color-fails.css', `${LIGHT.replace('--color-warning: oklch(0.52 0.105 85);', '--color-warning: oklch(0.90 0.105 85);')}\n[data-theme="dark"] {${DARK_DECLS}}`, false],
];

let bad = 0;
for (const [name, css, shouldPass] of cases) {
  const file = join(dir, name);
  writeFileSync(file, css);
  let passed = true;
  try {
    execFileSync('node', ['scripts/audit.mjs', '--palette', file, '--src', join(dir, 'src')], { stdio: 'pipe' });
  } catch {
    passed = false;
  }
  const ok = passed === shouldPass;
  console.log(`${ok ? '✓' : '✗'} ${name}: audit ${passed ? 'passed' : 'failed'} (expected ${shouldPass ? 'pass' : 'fail'})`);
  if (!ok) bad++;
}

if (bad) process.exit(1);

/* ── Lineage doc-drift check (consensus condition, 2026-07-20) ──────
   The Butterick Lineage table in REMARQUE.md quotes token values; assert
   they match tokens.json so the doc can never drift from the tokens. */
import { readFileSync } from 'node:fs';
const spec = readFileSync('REMARQUE.md', 'utf8');
const tokens = JSON.parse(readFileSync('tokens.json', 'utf8'));
const lineageChecks = [
  ['--text-body: 1.0625rem', tokens.core['text-body'].$value === '1.0625rem'],
  ['--text-body-lg: 1.1875rem', tokens.core['text-body-lg'].$value === '1.1875rem'],
  ['--leading-body: 1.75', tokens.core['leading-body'].$value === 1.75],
  ['--leading-meta: 1.5', tokens.core['leading-meta'].$value === 1.5],
  ['--content-reading: 46rem', tokens.palette['content-reading'].light.$value === '46rem'],
];
let lineageBad = 0;
for (const [quoted, matches] of lineageChecks) {
  const inDoc = spec.includes(quoted.replace(': ', ': `').replace(/$/, '')) || spec.includes(quoted);
  const ok = inDoc && matches;
  console.log(`${ok ? '✓' : '✗'} lineage: ${quoted} (in doc: ${inDoc}, matches tokens.json: ${matches})`);
  if (!ok) lineageBad++;
}
if (lineageBad) {
  console.error(`lineage doc-drift check FAILED — ${lineageBad} mismatch(es)`);
  process.exit(1);
}
console.log('lineage doc-drift check passed ✓');
