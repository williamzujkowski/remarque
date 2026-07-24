#!/usr/bin/env node
/*
 * Packages the canonical Claude Code skills for npm distribution.
 *
 *   node scripts/build-skills.mjs          # (re)write skills/<name>/SKILL.md
 *   node scripts/build-skills.mjs --check  # exit 1 if any packaged copy is stale (CI)
 *
 * `.claude/skills/<name>/SKILL.md` is the ONE hand-authored copy (also
 * what a Claude Code session working in this repo reads directly, no
 * indirection). This script copies it byte-for-byte into `skills/<name>/
 * SKILL.md`, the location published in the npm tarball (package.json
 * "files" + the "./skills/remarque" / "./skills/adopt" exports) — the
 * same single-source-of-truth-plus-generated-copy relationship
 * tokens.json has to tokens-core.css/tokens-palette.css (scripts/
 * tokens-json.mjs --check), kept fresh by the same convention: run this
 * script whenever a canonical SKILL.md changes, --check gates CI so a
 * stale packaged copy can't ship silently.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { SKILLS } from './lib/skills.mjs';

const CHECK = process.argv.includes('--check');
let bad = 0;

for (const { name, canonical, packaged } of SKILLS) {
  if (!existsSync(canonical)) {
    console.error(`✗ ${name}: canonical file missing: ${canonical}`);
    bad++;
    continue;
  }
  const src = readFileSync(canonical, 'utf8');

  if (CHECK) {
    const current = existsSync(packaged) ? readFileSync(packaged, 'utf8') : null;
    if (current === src) {
      console.log(`✓ ${packaged} is fresh (matches ${canonical})`);
    } else {
      console.error(`✗ ${packaged} is STALE vs ${canonical} — run \`node scripts/build-skills.mjs\` and commit the result`);
      bad++;
    }
    continue;
  }

  mkdirSync(dirname(packaged), { recursive: true });
  writeFileSync(packaged, src);
  console.log(`wrote ${packaged} (from ${canonical})`);
}

if (bad) {
  console.error(`\nbuild-skills ${CHECK ? '--check' : ''} FAILED — ${bad} issue(s)`);
  process.exit(1);
}
if (!CHECK) console.log('\nskills/ packaging copies up to date.');
