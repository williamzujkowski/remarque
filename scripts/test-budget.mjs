#!/usr/bin/env node
/*
 * CSS size budget + module-closure test (issue #120, item 5).
 *
 *  1. Size budget: every shipped CSS file (package.json `files` entries
 *     ending in .css) is gzip(9) and brotli(max) compressed and compared
 *     with budgets.json. Budget = current size * 1.10, rounded up to the
 *     next 100 bytes. A shipped file with no entry fails, as does an entry
 *     for a file that no longer ships. `--update` rewrites budgets.json.
 *     tokens.css is an aggregator of @imports, so its effective bare-import
 *     size (the imports concatenated in import order, then tokens.css
 *     itself) is budgeted and reported as "tokens.css (effective)".
 *  2. Module closure: every var(--x) in the optional modules must resolve to
 *     a custom property declared in tokens-core.css / tokens-palette.css or
 *     locally in the same module.
 *
 * budgets.json is a repo-only file; it is not in package.json `files`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');
const EFFECTIVE = 'tokens.css (effective)';
const HEADROOM = 1.10;

// Blank out comments but keep newlines so line numbers stay correct.
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const gz = (s) => gzipSync(s, { level: 9 }).length;
const br = (s) => brotliCompressSync(s, {
  params: { [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY },
}).length;
const budgetOf = (n) => Math.ceil((n * HEADROOM) / 100) * 100;

// ---- 1. sizes -------------------------------------------------------------
const pkg = JSON.parse(read('package.json'));
const shipped = pkg.files.filter((f) => f.endsWith('.css'));

const sizes = {};
for (const f of shipped) {
  const css = read(f);
  sizes[f] = { gzip: gz(css), brotli: br(css) };
}
// Effective bare tokens.css: @import targets in order, then the aggregator body.
const aggregator = read('tokens.css');
const imports = [...stripComments(aggregator).matchAll(/@import\s+(?:url\()?['"]\.\/([^'"]+)['"]/g)].map((m) => m[1]);
const effective = imports.map(read).join('\n') + '\n' + aggregator;
sizes[EFFECTIVE] = { gzip: gz(effective), brotli: br(effective) };

const budgetsPath = join(root, 'budgets.json');
if (process.argv.includes('--update')) {
  const out = {};
  for (const k of Object.keys(sizes).sort()) {
    out[k] = { gzip: budgetOf(sizes[k].gzip), brotli: budgetOf(sizes[k].brotli) };
  }
  writeFileSync(budgetsPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`budgets.json updated (${Object.keys(out).length} entries)`);
}

let budgets;
try { budgets = JSON.parse(readFileSync(budgetsPath, 'utf8')); }
catch { console.error('FAIL budgets.json missing or invalid; run with --update'); process.exit(1); }

let failures = 0;
const fail = (m) => { failures++; console.error('FAIL ' + m); };

console.log(`${'file'.padEnd(26)} ${'gzip'.padStart(6)} ${'budget'.padStart(7)} ${'brotli'.padStart(7)} ${'budget'.padStart(7)}`);
for (const [k, s] of Object.entries(sizes)) {
  const b = budgets[k];
  if (!b) { fail(`${k} ships but has no entry in budgets.json (run --update)`); continue; }
  console.log(`${k.padEnd(26)} ${String(s.gzip).padStart(6)} ${String(b.gzip).padStart(7)} ${String(s.brotli).padStart(7)} ${String(b.brotli).padStart(7)}`);
  if (s.gzip > b.gzip) fail(`${k} gzip ${s.gzip} > budget ${b.gzip}`);
  if (s.brotli > b.brotli) fail(`${k} brotli ${s.brotli} > budget ${b.brotli}`);
}
for (const k of Object.keys(budgets)) {
  if (!(k in sizes)) fail(`budgets.json lists ${k}, which no longer ships`);
}

// ---- 2. module closure ----------------------------------------------------
const MODULES = ['prose.css', 'essay.css', 'broadsheet.css', 'forms.css', 'chrome.css', 'print.css'];
/* Intentional consumer hooks: referenced but not declared by the package.
   One entry per name, each with the reason. Empty on purpose. */
const ALLOW = new Set([
  // '--example', // optional consumer hook with a fallback
]);

const declared = (css) => new Set([...stripComments(css).matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map((m) => m[1]));
const shared = new Set([...declared(read('tokens-core.css')), ...declared(read('tokens-palette.css'))]);

let unresolved = 0;
for (const f of MODULES) {
  const css = stripComments(read(f));
  const local = declared(css);
  css.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) {
      const name = m[1];
      if (shared.has(name) || local.has(name) || ALLOW.has(name)) continue;
      unresolved++;
      fail(`${f}:${i + 1} var(${name}) is not declared in tokens-core.css, tokens-palette.css or ${f}`);
    }
  });
}
console.log(`module closure: ${MODULES.length} modules, ${unresolved} unresolved var() reference(s)`);

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('test-budget: ok');
