#!/usr/bin/env node
/*
 * Generates registry.json (the index) + registry/<name>.json (the four
 * full items) — Remarque's machine-readable markup-contract registry,
 * shaped like shadcn's registry-item.json/registry.json (issue #100). See
 * registry-item.schema.json / registry.schema.json for the field-by-field
 * adaptation from shadcn, and REMARQUE.md's "The Registry" section for the
 * prose version of the same argument.
 *
 *   node scripts/build-registry.mjs           # (re)write registry.json + registry/*.json
 *   node scripts/build-registry.mjs --check   # exit 1 if either is stale (CI)
 *
 * Single-sourcing: every item's CSS content is read verbatim from the real
 * .css file at build time (never duplicated by hand); every item's
 * usage.html is extracted from REMARQUE.md's own "Markup contract" fenced
 * samples via a `registry-usage:<name>` marker comment (see
 * scripts/lib/registry-extract.mjs) — REMARQUE.md's prose stays the one
 * hand-authored copy of each known-good sample.
 *
 * Mandatory scope is the four modules named in issue #100 (essay,
 * broadsheet, forms, palette-deck) — the per-archetype "starter-page"
 * items floated as an IF-cheap extra are SKIPPED this round: archetype
 * pages live as demo-specific Astro files (site/src/pages/**), not as a
 * reusable module with its own CSS + one canonical markup sample the way
 * these four are, so extracting one would mean inventing a new kind of
 * "canonical" sample rather than single-sourcing an existing one. Revisit
 * if/when an archetype grows a dedicated, package-shipped reference markup
 * block the way essay/broadsheet/forms/palette-deck already have.
 *
 * SECURITY (blocking, panel-mandated): pinned version + sha256 integrity
 * per item (scripts/lib/registry-extract.mjs's sha256OfFiles); every docs/
 * homepage URL is HTTPS; no executable content — deck.js (the one JS asset
 * this package ships) is deliberately EXCLUDED from the registry entirely,
 * not merely hashed-and-included, and palette-deck's usage.html omits even
 * the FOUC-restore <script> sample that REMARQUE.md documents alongside it
 * — see the palette-deck item's `description` below and REMARQUE.md "The
 * Registry" for the full argument.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { extractUsageHtml, sha256OfFiles, cssVarsOf } from './lib/registry-extract.mjs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;
const remarqueMd = readFileSync('REMARQUE.md', 'utf8');

const SPEC_BASE = 'https://github.com/williamzujkowski/remarque/blob/main/REMARQUE.md';

function cssFile(path) {
  return { path, content: readFileSync(path, 'utf8'), type: 'remarque:css' };
}

function markupFile(name) {
  return { path: 'usage.html', content: extractUsageHtml(remarqueMd, name), type: 'remarque:markup' };
}

const ITEM_DEFS = [
  {
    name: 'essay',
    title: 'Essay Module',
    description:
      'Sidenotes + sticky TOC rail for long-form Essay pages: margin notes relocated into real DOM order, right after the paragraph that cites them, numbered by CSS counter and labeled `aria-label="Note N"` in the same order the counter advances — the mechanism that prevents the sidenote aria-label/DOM-order transcription bug found in the flagship migration (#89, williamzujkowski.github.io#380).',
    docs: `${SPEC_BASE}#essay-module`,
    cssPaths: ['essay.css'],
  },
  {
    name: 'broadsheet',
    title: 'Broadsheet Pattern',
    description:
      'The editorial Landing/archive pattern: masthead, lead article, numbered entry list, and post-header kicker. Entry numerals are generated from `data-entry-number` via `attr()`, never `counter()`, and every kicker/dateline row is true `font-variant-caps: all-small-caps`, never `text-transform: uppercase`.',
    docs: `${SPEC_BASE}#broadsheet`,
    cssPaths: ['broadsheet.css'],
  },
  {
    name: 'forms',
    title: 'Forms Primitives',
    description:
      'Native field/input/checkbox/radio/button primitives with state-color wiring. Every `.remarque-input` pairs `for`/`id` with its `.remarque-field-label`, and every `.remarque-field-message` is wired via `aria-describedby` on the control — the paint-layer `data-state` attribute is never the only signal; `aria-invalid`/`aria-describedby` on the input carry the real accessibility contract.',
    docs: `${SPEC_BASE}#forms`,
    cssPaths: ['forms.css'],
  },
  {
    name: 'palette-deck',
    title: 'Palette Deck (markup contract only — no executable content)',
    description:
      'Markup/wiring contract for the Palette Deck: set `data-palette` on the same root element as `data-theme` and the two compose independently. This item ships ONLY that HTML fragment. `deck.js` — the runtime module itself, a dependency-free ~60-line ESM file — is deliberately NOT embedded here: the registry’s blocking no-executable-content condition is held to an unambiguous zero-`<script>`-tag bar across every item, so neither `deck.js` nor the FOUC-restore `<script>` sample documented alongside it in REMARQUE.md is included. Consume `deck.js` the normal way, via the `remarque-tokens/deck` package import (`dependencies` below); read the FOUC-restore snippet from the `docs` URL.',
    docs: `${SPEC_BASE}#palette-deck`,
    cssPaths: [],
  },
];

mkdirSync('registry', { recursive: true });

const indexItems = [];
const itemFiles = {}; // name -> { path, json }

for (const def of ITEM_DEFS) {
  const files = [...def.cssPaths.map(cssFile), markupFile(def.name)];
  const allCss = def.cssPaths.map((p) => readFileSync(p, 'utf8')).join('\n');

  const item = {
    $schema: 'https://williamzujkowski.github.io/remarque/registry-item.schema.json',
    name: def.name,
    type: 'remarque:contract',
    title: def.title,
    description: def.description,
    version,
    integrity: sha256OfFiles(files),
    dependencies: ['remarque-tokens'],
    cssVars: cssVarsOf(allCss),
    docs: def.docs,
    files,
  };

  const path = `registry/${def.name}.json`;
  const json = JSON.stringify(item, null, 2) + '\n';
  itemFiles[def.name] = { path, json };

  indexItems.push({
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
    version: item.version,
    integrity: item.integrity,
    file: path,
  });
}

const registryIndex = {
  $schema: 'https://williamzujkowski.github.io/remarque/registry.schema.json',
  name: 'remarque-tokens',
  homepage: pkg.homepage,
  version,
  items: indexItems,
};
const indexJson = JSON.stringify(registryIndex, null, 2) + '\n';

if (process.argv.includes('--check')) {
  let stale = [];
  const currentIndex = existsSync('registry.json') ? readFileSync('registry.json', 'utf8') : '';
  if (currentIndex !== indexJson) stale.push('registry.json');
  for (const [name, { path, json }] of Object.entries(itemFiles)) {
    const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
    if (current !== json) stale.push(path);
  }
  if (stale.length) {
    for (const f of stale) console.error(`${f} is stale — run: node scripts/build-registry.mjs`);
    process.exit(1);
  }
  console.log(`registry.json + registry/*.json are fresh ✓ (${indexItems.length} items)`);
} else {
  writeFileSync('registry.json', indexJson);
  for (const { path, json } of Object.values(itemFiles)) writeFileSync(path, json);
  console.log(`registry.json + ${indexItems.length} registry/*.json item(s) written (v${version})`);
}
