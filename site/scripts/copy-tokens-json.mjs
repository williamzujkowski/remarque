#!/usr/bin/env node
/*
 * Prebuild step: copies the installed remarque-tokens package's
 * tokens.json + tokens.schema.json, and (issue #100) its markup-contract
 * registry.json + registry/*.json + the two registry schemas, into
 * public/ so the built demo site serves them at /tokens.json,
 * /registry.json, /registry/<name>.json, etc. — the URLs documented in
 * the root README's "For AI Agents" section and REMARQUE.md's "The
 * Registry" section, for remote agents/tooling that want current
 * token/contract data without trusting training data or cloning the
 * repo. (issue #99 — shadcn's schema-URL precedent: ship the schema
 * beside the data file it describes.)
 *
 * tokens-core.css/tokens-palette.css and REMARQUE.md's markup-contract
 * samples remain the single sources of truth; this is a build-time copy
 * of the package's already-generated files, not a second source of
 * generation.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..', 'node_modules', 'remarque-tokens');
const publicDir = join(here, '..', 'public');

function copy(src, dest) {
  if (!existsSync(src)) {
    console.error(`copy-tokens-json: source not found at ${src} — did npm install run?`);
    process.exit(1);
  }
  copyFileSync(src, dest);
  console.log(`copy-tokens-json: copied ${src} -> ${dest}`);
}

for (const name of ['tokens.json', 'tokens.schema.json', 'registry.json', 'registry-item.schema.json', 'registry.schema.json']) {
  copy(join(pkgDir, name), join(publicDir, name));
}

const registrySrcDir = join(pkgDir, 'registry');
const registryDestDir = join(publicDir, 'registry');
mkdirSync(registryDestDir, { recursive: true });
for (const entry of readdirSync(registrySrcDir)) {
  if (!entry.endsWith('.json')) continue;
  copy(join(registrySrcDir, entry), join(registryDestDir, entry));
}
