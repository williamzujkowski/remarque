#!/usr/bin/env node
/*
 * Prebuild step (issue #130 item 4): generates public/llms-full.txt, served
 * at /remarque/llms-full.txt beside the hand-written llms.txt pointer.
 * llms.txt stays a short pointer; this is the "everything in one fetch"
 * file for agents that want the implementation contract without
 * following links: the installed package's AGENT_RULES.md verbatim,
 * followed by a compact token table (name, tier, light value, dark value)
 * derived from the package's tokens.json. Nothing here is hand-written;
 * AGENT_RULES.md and tokens.json remain the sources of truth.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..', 'node_modules', 'remarque-tokens');
const out = join(here, '..', 'public', 'llms-full.txt');

const rules = readFileSync(join(pkgDir, 'AGENT_RULES.md'), 'utf8');
const tokens = JSON.parse(readFileSync(join(pkgDir, 'tokens.json'), 'utf8'));
const version = tokens.$extensions?.remarque?.version ?? 'unknown';

const cell = (v) => String(v).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

const rows = [];
for (const [name, tok] of Object.entries(tokens.core ?? {})) {
  rows.push([`--${name}`, 'core', tok.$value, tok.$value]);
}
for (const [name, tok] of Object.entries(tokens.palette ?? {})) {
  rows.push([`--${name}`, 'palette', tok.light?.$value ?? '', tok.dark?.$value ?? '']);
}

const table = [
  '| token | tier | light | dark |',
  '| --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`),
].join('\n');

const text = `# Remarque — llms-full.txt

> Generated at site build time from remarque-tokens v${version}: AGENT_RULES.md verbatim, then a compact token table. For the short pointer see /remarque/llms.txt; for the full spec see REMARQUE.md; for every token with DTCG types see /remarque/tokens.json.

---

${rules.trim()}

---

# Token table (remarque-tokens v${version})

Core tier: immutable identity, same value in both themes. Palette tier: the sanctioned personalization surface, with a light and a dark value (dark may inherit light).

${table}
`;

writeFileSync(out, text);
console.log(`build-llms-full: wrote ${out} (${rows.length} tokens, ${text.length} bytes)`);
