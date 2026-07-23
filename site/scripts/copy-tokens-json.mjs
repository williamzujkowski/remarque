#!/usr/bin/env node
/*
 * Prebuild step: copies the installed remarque-tokens package's
 * tokens.json + tokens.schema.json into public/ so the built demo site
 * serves them at /tokens.json and /tokens.schema.json — the URLs
 * documented in the root README's "For AI Agents" section, for remote
 * agents/tooling that want current token values (and the schema that
 * describes their shape) without trusting training data or cloning the
 * repo. (issue #99 — shadcn's schema-URL precedent: ship the schema
 * beside the data file it describes.)
 *
 * tokens-core.css / tokens-palette.css remain the single source of
 * truth; this is a build-time copy of the package's already-generated
 * files, not a second source of generation.
 */

import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..', 'node_modules', 'remarque-tokens');
const publicDir = join(here, '..', 'public');

for (const name of ['tokens.json', 'tokens.schema.json']) {
  const src = join(pkgDir, name);
  const dest = join(publicDir, name);
  if (!existsSync(src)) {
    console.error(`copy-tokens-json: source not found at ${src} — did npm install run?`);
    process.exit(1);
  }
  copyFileSync(src, dest);
  console.log(`copy-tokens-json: copied ${src} -> ${dest}`);
}
