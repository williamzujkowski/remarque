#!/usr/bin/env node
/*
 * Prebuild step: copies the installed remarque-tokens package's
 * tokens.json into public/ so the built demo site serves it at
 * /tokens.json — the URL documented in the root README's "For AI
 * Agents" section, for remote agents that want current token values
 * without trusting training data or cloning the repo.
 *
 * tokens-core.css / tokens-palette.css remain the single source of
 * truth; this is a build-time copy of the package's already-generated
 * tokens.json, not a second source of generation.
 */

import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'node_modules', 'remarque-tokens', 'tokens.json');
const dest = join(here, '..', 'public', 'tokens.json');

if (!existsSync(src)) {
  console.error(`copy-tokens-json: source not found at ${src} — did npm install run?`);
  process.exit(1);
}

copyFileSync(src, dest);
console.log(`copy-tokens-json: copied ${src} -> ${dest}`);
