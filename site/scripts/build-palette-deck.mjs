#!/usr/bin/env node
/*
 * Prebuild step: publishes remarque-tokens' prebuilt curated Palette Deck
 * (deck/deck.css + deck/deck.json, 0.31) into public/palettes/, the way a
 * consumer site would serve it. The deck is generated and audited in the
 * package itself (remarque-deck --curated, freshness-gated in CI), so the
 * demo uses exactly the bytes that ship. public/palettes/ is gitignored.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const outDir = join(here, '..', 'public', 'palettes');
mkdirSync(outDir, { recursive: true });
for (const f of ['deck.css', 'deck.json']) copyFileSync(require.resolve(`remarque-tokens/${f}`), join(outDir, f));
console.log(`build-palette-deck: copied remarque-tokens/deck.css + deck.json into ${outDir}`);
