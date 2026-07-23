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
  --color-viz-1: oklch(0.538 0.121 250.5);
  --color-viz-2: oklch(0.541 0.111 85.5);
  --color-viz-3: oklch(0.524 0.12 24.6);
  --color-viz-4: oklch(0.499 0.12 144.8);
  --color-viz-5: oklch(0.524 0.121 309.6);
  --color-viz-6: oklch(0.528 0.09 195.8);
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
  --color-viz-1: oklch(0.708 0.129 249.5);
  --color-viz-2: oklch(0.712 0.13 85.3);
  --color-viz-3: oklch(0.724 0.129 310.2);
  --color-viz-4: oklch(0.725 0.129 25.4);
  --color-viz-5: oklch(0.696 0.129 144.9);
  --color-viz-6: oklch(0.697 0.119 194.8);
`;

/* ── light-dark() fixture builder (issue #95) ────────────────────────
 * Mechanically re-expresses the LIGHT/DARK_DECLS pair above as
 * `light-dark(<light>, <dark>)` single declarations under one :root
 * block, instead of two selectors — same token names, same values, so
 * any pass/fail outcome comparison against the conventional-form
 * fixtures above is apples-to-apples. `names` restricts which tokens get
 * wrapped (the rest are emitted as plain light-only declarations,
 * unwrapped) — used below to build a MIXED-form fixture where some
 * tokens use light-dark() and others still use the old two-block
 * convention in the same file. */
function parseDecls(css) {
  const out = {};
  for (const m of css.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const LIGHT_DECLS_MAP = parseDecls(LIGHT);
const DARK_DECLS_MAP = parseDecls(DARK_DECLS);

function buildLightDarkRoot(names) {
  // A name with no distinct dark value in DARK_DECLS_MAP (e.g. the test
  // fixture's --color-bg-subtle/--color-border, which the LIGHT/
  // DARK_DECLS pair above never redeclares) is emitted as a plain light-
  // only declaration, exactly like a real palette's pure var() aliases —
  // no override means the dark theme inherits the light value via the
  // ordinary cascade, the same fallback darkOverridesOf() already
  // implements for a token that's declared once.
  const lines = names.map((name) =>
    name in DARK_DECLS_MAP
      ? `  --${name}: light-dark(${LIGHT_DECLS_MAP[name]}, ${DARK_DECLS_MAP[name]});`
      : `  --${name}: ${LIGHT_DECLS_MAP[name]};`
  );
  return `:root {\n  color-scheme: light dark;\n${lines.join('\n')}\n}`;
}

const ALL_NAMES = Object.keys(LIGHT_DECLS_MAP);
const LIGHT_DARK_FORM_CSS = buildLightDarkRoot(ALL_NAMES);

// Mixed-form: the first half of the tokens migrated to light-dark(), the
// second half left in the OLD :root + [data-theme="dark"] two-block
// convention, both in the SAME file — proves the parser handles a
// palette mid-migration, not just an all-or-nothing one.
const MIXED_LIGHT_NAMES = ALL_NAMES.slice(0, Math.ceil(ALL_NAMES.length / 2));
const MIXED_CONVENTIONAL_NAMES = ALL_NAMES.slice(Math.ceil(ALL_NAMES.length / 2));
const MIXED_CONVENTIONAL_WITH_DARK = MIXED_CONVENTIONAL_NAMES.filter((n) => n in DARK_DECLS_MAP);
const MIXED_FORM_CSS =
  buildLightDarkRoot(MIXED_LIGHT_NAMES) +
  `\n:root {\n${MIXED_CONVENTIONAL_NAMES.map((n) => `  --${n}: ${LIGHT_DECLS_MAP[n]};`).join('\n')}\n}` +
  `\n[data-theme="dark"] {\n${MIXED_CONVENTIONAL_WITH_DARK.map((n) => `  --${n}: ${DARK_DECLS_MAP[n]};`).join('\n')}\n}`;

// Must-fail via light-dark(): --color-fg-muted's DARK side (only) is
// perturbed to a value that cannot hold the 7:1 AAA line against
// --color-bg in the dark theme — proves the dark side of a light-dark()
// declaration is actually extracted into darkDecls and enforced, not
// silently accepted or ignored.
const LIGHT_DARK_FAILS_NAMES = ALL_NAMES.filter((n) => n !== 'color-fg-muted');
const LIGHT_DARK_FAILS_CSS =
  buildLightDarkRoot(LIGHT_DARK_FAILS_NAMES) +
  // Dark bg is oklch(0.16 ...) — the real dark --color-fg-muted (0.70)
  // holds 7.26:1; moving it much closer to bg's own lightness (0.30,
  // still lighter than bg but nowhere near enough) drops well under the
  // 7:1 AAA line, the dark-theme mirror of how light-fails.css fails
  // the light theme.
  `\n:root {\n  --color-fg-muted: light-dark(${LIGHT_DECLS_MAP['color-fg-muted']}, oklch(0.30 0.01 80));\n}`;

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
  // A dataviz categorical slot too close to bg must fail — proves the 6
  // new --color-viz-* pairings (issue #94) are actually wired into
  // CHECKS at the 3:1 mark threshold, not just parsed. oklch(0.92 0.02
  // 250.5) sits far too light on --color-bg (oklch(0.975 0.005 80)) to
  // hold even the lower 3:1 non-text bar.
  ['viz-slot-fails.css', `${LIGHT.replace('--color-viz-1: oklch(0.538 0.121 250.5);', '--color-viz-1: oklch(0.92 0.02 250.5);')}\n[data-theme="dark"] {${DARK_DECLS}}`, false],
  // issue #93 regression: a `[data-theme="dark"]`/`:root.dark` selector
  // NESTED inside an unrelated media query (the shape tokens-palette.css's
  // `@media (prefers-contrast: more)` block uses) must NOT be read as
  // redefining dark mode — only the real, top-level dark block above
  // should win. The nested block's absurd --color-fg-muted (oklch(0.99...),
  // near-white) would fail AAA outright if it leaked into darkOverrides
  // (declsOf is last-write-wins); expect PASS proves it was correctly
  // excluded and the real DARK_DECLS value is still what gets checked.
  [
    'nested-media-not-dark.css',
    `${LIGHT}\n[data-theme="dark"] {${DARK_DECLS}}\n@media (prefers-contrast: more) { [data-theme="dark"], :root.dark { --color-fg-muted: oklch(0.99 0.01 80); } }`,
    true,
  ],
  // Same regression, compound-media shape: `@media (prefers-color-scheme:
  // dark) and (prefers-contrast: more)` — a plain `.includes('prefers-
  // color-scheme')`/`.includes('dark')` substring check on the context
  // would misread this as THE dark-scheme media block even though it is
  // gated on a second, unrelated condition too. Expect PASS for the same
  // reason as above.
  [
    'compound-media-not-dark.css',
    `${LIGHT}\n[data-theme="dark"] {${DARK_DECLS}}\n@media (prefers-color-scheme: dark) and (prefers-contrast: more) { :root { --color-fg-muted: oklch(0.99 0.01 80); } }`,
    true,
  ],
  // light-dark() form (issue #95) — every token from the same
  // LIGHT/DARK_DECLS pair every conventional-form fixture above uses,
  // re-expressed as light-dark(<light>, <dark>) single declarations.
  // Same values, so this must pass exactly like attr-convention.css.
  ['light-dark-form.css', LIGHT_DARK_FORM_CSS, true],
  // Mixed-form (issue #95) — half the tokens migrated to light-dark(),
  // half still in the old :root + [data-theme="dark"] two-block
  // convention, in the SAME file. Proves a palette mid-migration parses
  // correctly, not just an all-light-dark or all-conventional file.
  ['mixed-form.css', MIXED_FORM_CSS, true],
  // Must-fail via light-dark() (issue #95) — --color-fg-muted's DARK
  // side (only) is perturbed to a value that cannot hold 7:1 AAA against
  // --color-bg in the dark theme. Proves the parser actually extracts
  // and enforces the dark side of a light-dark() declaration, not just
  // the light side or nothing at all.
  ['light-dark-fails.css', LIGHT_DARK_FAILS_CSS, false],
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

/* ── --json fixture coverage (issue #98) ─────────────────────────────
   Run once against a passing fixture and once against a known must-fail
   fixture; parse the JSON, assert the documented shape (AGENT_RULES.md
   "remarque-audit --json"), and assert the must-fail fixture's offending
   pairing actually surfaces in `contrast` with passed:false. */
{
  let jsonBad = 0;
  function expect(label, cond) {
    const ok = !!cond;
    console.log(`${ok ? '✓' : '✗'} ${label}`);
    if (!ok) jsonBad++;
  }

  const goodFile = join(dir, 'attr-convention.css');
  const goodOut = execFileSync(
    'node',
    ['scripts/audit.mjs', '--palette', goodFile, '--src', join(dir, 'src'), '--json'],
    { encoding: 'utf8' }
  );
  expect('--json stdout is ONLY the JSON document (no leading/trailing human text)', goodOut.trim().startsWith('{') && goodOut.trim().endsWith('}'));
  const good = JSON.parse(goodOut);
  expect(
    'report has version/palette/src/passed',
    typeof good.version === 'string' && good.palette === goodFile && good.src === join(dir, 'src') && good.passed === true
  );
  expect(
    'report.contrast is a non-empty array of {theme,fg,bg,required,actual,ok}',
    Array.isArray(good.contrast) && good.contrast.length > 0 &&
      good.contrast.every((c) => 'theme' in c && 'fg' in c && 'bg' in c && 'required' in c && 'actual' in c && 'ok' in c)
  );
  expect(
    'report.gamut is a non-empty array of {theme,token,value,ok}',
    Array.isArray(good.gamut) && good.gamut.length > 0 &&
      good.gamut.every((g) => 'theme' in g && 'token' in g && 'value' in g && 'ok' in g)
  );
  expect(
    'report.srcScans has the fontFloor/unverifiableFontSize/hardcodedColors/oklchLiteral arrays',
    good.srcScans && ['fontFloor', 'unverifiableFontSize', 'hardcodedColors', 'oklchLiteral'].every((k) => Array.isArray(good.srcScans[k]))
  );
  expect('report.failures is an empty array on a passing fixture', Array.isArray(good.failures) && good.failures.length === 0);

  // light-fails.css lowers --color-fg-muted so it can no longer hold the
  // spec's 7:1 AAA line against --color-bg in the light theme (see the
  // `cases` fixture above).
  const badFile = join(dir, 'light-fails.css');
  let badReport;
  try {
    execFileSync('node', ['scripts/audit.mjs', '--palette', badFile, '--src', join(dir, 'src'), '--json'], { encoding: 'utf8' });
    expect('must-fail fixture: audit --json still exits 1', false);
  } catch (e) {
    expect('must-fail fixture: audit --json still exits 1', e.status === 1);
    badReport = JSON.parse(e.stdout);
  }
  expect('must-fail fixture: report.passed === false', badReport?.passed === false);
  expect(
    'must-fail fixture: the offending fg-muted/bg pairing is present with ok:false',
    badReport?.contrast?.some((c) => c.theme === 'light' && c.fg === 'color-fg-muted' && c.bg === 'color-bg' && c.ok === false)
  );
  expect(
    'must-fail fixture: report.failures[] names the offending pairing',
    badReport?.failures?.some((m) => m.includes('color-fg-muted/color-bg'))
  );

  if (jsonBad) {
    console.error(`--json fixture checks FAILED — ${jsonBad} problem(s)`);
    process.exit(1);
  }
}

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
