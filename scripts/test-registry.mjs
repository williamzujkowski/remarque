#!/usr/bin/env node
/*
 * Fixture/gate tests for the markup-contract registry (registry.json +
 * registry/*.json, scripts/build-registry.mjs — issue #100). Run:
 * node scripts/test-registry.mjs (wired into deploy.yml). Exit 1 on any
 * unexpected outcome. Style mirrors scripts/test-types.mjs (ajv schema
 * validation + negative fixtures) and scripts/test-audit.mjs (expect()
 * helper) — no new dependency beyond the existing `ajv`.
 *
 * This is the "enforce, don't instruct" gate the issue is funded on: it
 * does not just check the registry's own shape, it mechanically re-derives
 * the exact bug class #89 was (a sidenote aria-label/DOM-order
 * transcription error) from each item's usage.html and fails loudly if a
 * future regeneration ever reintroduces it.
 */

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import { sha256OfFiles, cssVarsOf } from './lib/registry-extract.mjs';

let bad = 0;
function expect(label, cond, detail = '') {
  const ok = !!cond;
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : ` — ${detail}`}`);
  if (!ok) bad++;
}

const ITEM_NAMES = ['essay', 'broadsheet', 'forms', 'skip-link', 'breadcrumb', 'pager', 'tags', 'palette-deck'];

// 1. Freshness — regeneration from the CSS + REMARQUE.md markers must be a no-op.
try {
  execFileSync('node', ['scripts/build-registry.mjs', '--check'], { stdio: 'pipe' });
  expect('registry.json + registry/*.json are in sync with the CSS + REMARQUE.md', true);
} catch (e) {
  expect('registry.json + registry/*.json are in sync with the CSS + REMARQUE.md', false, e.stdout?.toString() || e.message);
}

expect('registry.json exists', existsSync('registry.json'));
expect('registry-item.schema.json exists', existsSync('registry-item.schema.json'));
expect('registry.schema.json exists', existsSync('registry.schema.json'));

const registryIndex = JSON.parse(readFileSync('registry.json', 'utf8'));
const itemSchema = JSON.parse(readFileSync('registry-item.schema.json', 'utf8'));
const indexSchema = JSON.parse(readFileSync('registry.schema.json', 'utf8'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

expect('registry-item.schema.json declares itself draft 2020-12', itemSchema.$schema === 'https://json-schema.org/draft/2020-12/schema');
expect('registry.schema.json declares itself draft 2020-12', indexSchema.$schema === 'https://json-schema.org/draft/2020-12/schema');

const ajv = new Ajv2020({ strict: true, allErrors: true });
const validateItem = ajv.compile(itemSchema);
const validateIndex = ajv.compile(indexSchema);

// 2. Index shape + schema validity.
expect('registry.json validates against registry.schema.json', validateIndex(registryIndex), JSON.stringify(validateIndex.errors));
expect(
  `registry.json lists exactly the 4 mandatory-scope items (${ITEM_NAMES.join(', ')})`,
  Array.isArray(registryIndex.items) &&
    registryIndex.items.length === ITEM_NAMES.length &&
    ITEM_NAMES.every((n) => registryIndex.items.some((it) => it.name === n)),
  JSON.stringify(registryIndex.items?.map((i) => i.name))
);

// Negative fixture: an index entry missing its integrity must be rejected —
// proves the schema actually constrains the shape rather than accepting anything.
const brokenIndex = structuredClone(registryIndex);
delete brokenIndex.items[0].integrity;
expect('mutated fixture (index entry missing "integrity") is REJECTED by registry.schema.json', validateIndex(brokenIndex) === false);

// 3. Per-item schema validity + content-addressed integrity + version pinning.
const items = {};
for (const name of ITEM_NAMES) {
  const path = `registry/${name}.json`;
  expect(`${path} exists`, existsSync(path));
  const item = JSON.parse(readFileSync(path, 'utf8'));
  items[name] = item;

  expect(`${path} validates against registry-item.schema.json`, validateItem(item), JSON.stringify(validateItem.errors));

  // SECURITY (blocking, panel condition): pinned version.
  expect(`${name}: version (${item.version}) matches package.json (${pkg.version})`, item.version === pkg.version);
  const indexEntry = registryIndex.items.find((it) => it.name === name);
  expect(`${name}: registry.json's index entry version/integrity mirrors the full item`, indexEntry?.version === item.version && indexEntry?.integrity === item.integrity);

  // SECURITY (blocking, panel condition): content hash, recomputed independently.
  const recomputed = sha256OfFiles(item.files);
  expect(`${name}: integrity hash matches a fresh sha256 of files (not just carried over)`, item.integrity === recomputed, `recorded=${item.integrity} recomputed=${recomputed}`);

  // SECURITY (blocking, panel condition): HTTPS-only.
  expect(`${name}: docs URL is https://`, item.docs.startsWith('https://'), item.docs);

  // SECURITY (blocking, panel condition): no executable content, in ANY
  // item, without exception — this is what makes the deck.js exclusion
  // real rather than aspirational.
  for (const file of item.files) {
    expect(`${name}: ${file.path} contains no <script (no executable content)`, !/<script/i.test(file.content));
  }
}
expect('homepage (registry.json) is https://', registryIndex.homepage.startsWith('https://'), registryIndex.homepage);

// Negative fixture: a mutated item missing "integrity" must be rejected.
const brokenItem = structuredClone(items.essay);
delete brokenItem.integrity;
expect('mutated fixture (item missing "integrity") is REJECTED by registry-item.schema.json', validateItem(brokenItem) === false);

// Negative fixture: an unknown file type must be rejected (additionalProperties/enum discipline).
const brokenFileType = structuredClone(items.essay);
brokenFileType.files[0].type = 'application/javascript';
expect('mutated fixture (file type "application/javascript") is REJECTED by registry-item.schema.json', validateItem(brokenFileType) === false);

// 4. cssVars sanity — re-derive independently from the real CSS files and
// compare, so "cssVars is grepped from the CSS" is proven, not asserted.
for (const name of ['essay', 'broadsheet', 'forms', 'skip-link', 'breadcrumb', 'pager', 'tags']) {
  const cssPath = ['skip-link', 'breadcrumb', 'pager', 'tags'].includes(name) ? 'chrome.css' : `${name}.css`;
  const expected = cssVarsOf(readFileSync(cssPath, 'utf8'));
  expect(`${name}: cssVars matches a fresh var(...) grep of ${cssPath}`, JSON.stringify(items[name].cssVars) === JSON.stringify(expected));
  expect(`${name}: cssVars is non-empty`, items[name].cssVars.length > 0);
}
expect('palette-deck: cssVars is empty (ships no CSS of its own)', items['palette-deck'].cssVars.length === 0);

// 5. deck.js is not embedded anywhere in the registry — the documented,
// deliberate call on the panel's blocking "no executable content"
// condition (see registry/palette-deck.json's description and REMARQUE.md
// "The Registry"). Checked two ways: no file named deck.js, and the
// literal deck.js source text doesn't appear inside any item's content.
const deckSource = readFileSync('deck.js', 'utf8');
for (const name of ITEM_NAMES) {
  for (const file of items[name].files) {
    expect(`${name}: ${file.path} is not deck.js`, file.path !== 'deck.js');
    expect(`${name}: ${file.path} does not embed deck.js's source`, !file.content.includes(deckSource.trim().slice(0, 40)));
  }
}
expect('palette-deck: ships no CSS file (deck.js has no CSS of its own)', !items['palette-deck'].files.some((f) => f.path.endsWith('.css')));

// 6. Mechanical markup-contract checks — the actual point of the issue:
// prevent the #89 bug class (sidenote aria-label/DOM-order transcription)
// and its siblings by asserting the CONTRACT, not by trusting prose.

// 6a. Essay — sidenote refs/notes, TOC rail aria-label.
{
  const html = items.essay.files.find((f) => f.path === 'usage.html').content;
  expect('essay usage.html: TOC rail nav carries aria-label', /<nav class="remarque-toc-rail"[^>]*aria-label="[^"]+"/.test(html));

  const refTags = [...html.matchAll(/<a[^>]*class="remarque-sidenote-ref"[^>]*>/g)].map((m) => m[0]);
  expect('essay usage.html: has at least one .remarque-sidenote-ref', refTags.length > 0);
  const missingAriaLabel = refTags.filter((t) => !/aria-label="Note \d+"/.test(t));
  expect('essay usage.html: every .remarque-sidenote-ref carries aria-label="Note N"', missingAriaLabel.length === 0, JSON.stringify(missingAriaLabel));

  // Strict ref/note DOM-order alternation (the exact #89 shape): walk the
  // tag stream in document order and assert ref, note, ref, note, ...
  const order = [...html.matchAll(/<(a|aside)\b[^>]*class="remarque-sidenote(-ref)?"[^>]*>/g)]
    .map((m) => (m[2] ? 'ref' : 'note'));
  let alternates = order.length > 0;
  for (let i = 0; i < order.length; i++) {
    if (order[i] !== (i % 2 === 0 ? 'ref' : 'note')) alternates = false;
  }
  expect('essay usage.html: sidenote ref/note strictly alternate in DOM order', alternates, JSON.stringify(order));

  const noteTags = [...html.matchAll(/<aside[^>]*class="remarque-sidenote"[^>]*>/g)].map((m) => m[0]);
  expect('essay usage.html: every .remarque-sidenote carries role="note"', noteTags.every((t) => /role="note"/.test(t)));
}

// 6b. Broadsheet — every entry numeral carries data-entry-number, entry list is a <ul> not <ol>.
{
  const html = items.broadsheet.files.find((f) => f.path === 'usage.html').content;
  const numeralTags = [...html.matchAll(/<span[^>]*class="remarque-entry-numeral"[^>]*>/g)].map((m) => m[0]);
  expect('broadsheet usage.html: has at least one .remarque-entry-numeral', numeralTags.length > 0);
  expect(
    'broadsheet usage.html: every .remarque-entry-numeral carries data-entry-number',
    numeralTags.every((t) => /data-entry-number="\d+"/.test(t)),
    JSON.stringify(numeralTags)
  );
  expect('broadsheet usage.html: entry list is a <ul>, not <ol>', /<ul class="remarque-entry-list"/.test(html) && !/<ol class="remarque-entry-list"/.test(html));
}

// 6c. Forms — every labeled control's for/id pair, every aria-describedby's target id.
{
  const html = items.forms.files.find((f) => f.path === 'usage.html').content;
  const inputIds = [...html.matchAll(/<input\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
  const labelFors = new Set([...html.matchAll(/<label\b[^>]*\bfor="([^"]+)"/g)].map((m) => m[1]));
  expect('forms usage.html: has at least one labeled input', inputIds.length > 0);
  const unlabeled = inputIds.filter((id) => !labelFors.has(id));
  expect('forms usage.html: every input id has a matching <label for=...>', unlabeled.length === 0, JSON.stringify(unlabeled));

  const describedBy = [...html.matchAll(/aria-describedby="([^"]+)"/g)].map((m) => m[1]);
  const allIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  expect('forms usage.html: has at least one aria-describedby', describedBy.length > 0);
  const dangling = describedBy.filter((id) => !allIds.has(id));
  expect('forms usage.html: every aria-describedby target id exists in the sample', dangling.length === 0, JSON.stringify(dangling));
}

// 6e. Chrome module (#127) — skip link target, breadcrumb current page,
// pager rel + no dead endpoints, tags rel + no DOM separators.
{
  const usage = (n) => items[n].files.find((f) => f.path === 'usage.html').content;

  const skip = usage('skip-link');
  const skipHref = (skip.match(/<a class="remarque-skip-link" href="#([^"]+)"/) || [])[1];
  expect('skip-link usage.html: .remarque-skip-link is the first element in <body>', /<body>\s*<a class="remarque-skip-link"/.test(skip));
  expect('skip-link usage.html: its target is <main id=…> with tabindex="-1"', !!skipHref && new RegExp(`<main id="${skipHref}" tabindex="-1">`).test(skip), skipHref);

  const bc = usage('breadcrumb');
  expect('breadcrumb usage.html: nav[aria-label="Breadcrumb"] > ol', /<nav class="remarque-breadcrumb" aria-label="Breadcrumb">\s*<ol>/.test(bc));
  const lis = [...bc.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
  expect('breadcrumb usage.html: the last item is aria-current="page" and not a link', lis.length > 1 && /aria-current="page"/.test(lis.at(-1)) && !/<a\b/.test(lis.at(-1)), JSON.stringify(lis.at(-1)));
  expect('breadcrumb usage.html: no separator typed into the DOM', lis.every((li) => !/^\s*[/>›»|]|[/>›»|]\s*$/.test(li.replace(/<[^>]+>/g, ''))));

  const pg = usage('pager');
  expect('pager usage.html: prev/next links carry rel="prev"/rel="next"',
    /<a class="remarque-pager-prev"[^>]*rel="prev"/.test(pg) && /<a class="remarque-pager-next"[^>]*rel="next"/.test(pg));
  expect('pager usage.html: every pager/pagination nav has an aria-label', [...pg.matchAll(/<nav class="remarque-(pager|pagination)"[^>]*>/g)].every((m) => /aria-label="[^"]+"/.test(m[0])));
  expect('pager usage.html: the current page/part is aria-current="page" text, not a link', !/<a\b[^>]*aria-current/.test(pg) && /<span aria-current="page">/.test(pg));
  expect('pager usage.html: no disabled-looking links (aria-disabled, href-less <a>, pointer-events)', !/aria-disabled|<a(?![^>]*href)[^>]*>|pointer-events/.test(pg));

  const tags = usage('tags');
  expect('tags usage.html: <ul class="remarque-tags"> with an accessible name', /<ul class="remarque-tags" aria-label="[^"]+">/.test(tags));
  const tagLinks = [...tags.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
  expect('tags usage.html: every tag link carries rel="tag"', tagLinks.length > 0 && tagLinks.every((t) => /rel="tag"/.test(t)), JSON.stringify(tagLinks));

  const chromeCss = readFileSync('chrome.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const tagsRules = [...chromeCss.matchAll(/\.remarque-tags[^{]*\{([^}]*)\}/g)].map((m) => m[1]).join('');
  expect('chrome.css: tags carry no border, background or radius (mono text, not pills)', !/border|background|radius/.test(tagsRules));
  expect('chrome.css: the skip link is never moved off-screen by offset', !/left:\s*-\d/.test(chromeCss));
}

// 6d. Palette Deck — data-palette/data-theme compose on the same element; no FOUC script embedded.
{
  const html = items['palette-deck'].files.find((f) => f.path === 'usage.html').content;
  expect('palette-deck usage.html: data-palette and data-theme set on the same element', /<html[^>]*data-theme="[^"]+"[^>]*data-palette="[^"]+"/.test(html) || /<html[^>]*data-palette="[^"]+"[^>]*data-theme="[^"]+"/.test(html));
  expect('palette-deck usage.html: does not embed the FOUC-restore <script> sample (deliberate exclusion)', !/<script/i.test(html));
}

// 7. shadcn-shaped copy (#130): registry/shadcn/*.json validate against the
// VENDORED official shadcn schemas (scripts/vendor/, no network in CI), carry
// the same content as the remarque:contract items, and a bad `type` is rejected.
{
  const Ajv7 = (await import('ajv')).default;
  const itemS = JSON.parse(readFileSync('scripts/vendor/shadcn-registry-item.schema.json', 'utf8'));
  const idxS = JSON.parse(readFileSync('scripts/vendor/shadcn-registry.schema.json', 'utf8'));
  const a7 = new Ajv7({ strict: false, allErrors: true, validateSchema: false });
  a7.addSchema(itemS, 'https://ui.shadcn.com/schema/registry-item.json');
  const vItem = a7.getSchema('https://ui.shadcn.com/schema/registry-item.json');
  const vIdx = a7.compile(idxS);

  const sIndex = JSON.parse(readFileSync('registry/shadcn/registry.json', 'utf8'));
  expect('shadcn registry.json validates against the vendored shadcn registry.json schema', vIdx(sIndex), JSON.stringify(vIdx.errors));
  expect('shadcn registry.json lists every item', ITEM_NAMES.every((n) => sIndex.items.some((i) => i.name === n)) && sIndex.items.length === ITEM_NAMES.length);

  const sItems = {};
  for (const name of ITEM_NAMES) {
    const sp = `registry/shadcn/${name}.json`;
    expect(`${sp} exists`, existsSync(sp));
    const si = JSON.parse(readFileSync(sp, 'utf8'));
    sItems[name] = si;
    expect(`${sp} validates against the vendored shadcn registry-item schema`, vItem(si), JSON.stringify(vItem.errors));
    expect(`${sp}: type is registry:item and every file is registry:file with a src/ target`, si.type === 'registry:item' && si.files.every((f) => f.type === 'registry:file' && f.target.startsWith('src/')));
    expect(`${sp}: dependencies are npm packages (remarque-tokens)`, JSON.stringify(si.dependencies) === '["remarque-tokens"]');
    const orig = items[name];
    expect(`${sp}: meta mirrors version/integrity/cssVars of registry/${name}.json`, si.meta.version === orig.version && si.meta.integrity === orig.integrity && JSON.stringify(si.meta.cssVars) === JSON.stringify(orig.cssVars));
    const norm = si.files.map((f) => ({ path: f.target.endsWith('.html') ? 'usage.html' : f.path, content: f.content }));
    expect(`${sp}: file contents are byte-identical to the contract item (integrity recomputes)`, sha256OfFiles(orig.files.map((f, i) => ({ path: f.path, content: norm[i].content }))) === orig.integrity);
    expect(`${sp}: no <script in any file`, si.files.every((f) => !/<script/i.test(f.content)));
  }
  expect('shadcn palette-deck: markup-only (no .css file)', sItems['palette-deck'].files.length === 1 && sItems['palette-deck'].files[0].target.endsWith('.html'));

  const badType = structuredClone(sItems.essay);
  badType.type = 'remarque:contract';
  expect('mutated fixture (shadcn item type "remarque:contract") is REJECTED by the shadcn schema', vItem(badType) === false);
  const noTarget = structuredClone(sItems.essay);
  delete noTarget.files[0].target;
  expect('mutated fixture (registry:file without target) is REJECTED by the shadcn schema', vItem(noTarget) === false);
}

if (bad) {
  console.error(`test-registry FAILED — ${bad} check(s) did not pass`);
  process.exit(1);
}
console.log('test-registry passed ✓');
