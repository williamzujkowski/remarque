#!/usr/bin/env node
/*
 * Prebuild step: generates the demo's palette-deck stylesheets with
 * remarque-theme --scope (remarque-tokens/deck, issue #56) so the deck
 * switcher on /tokens has something real to switch between.
 *
 * Pinned pairs (dataset @williamzujkowski/oklch-terminal-themes, resolved
 * from the root devDependency — see scripts/theme.mjs's resolution order):
 *   gruvbox    = gruvbox-light      / gruvbox-dark
 *   rose-pine  = rose-pine-dawn     / rose-pine
 *
 * Output goes to public/palettes/*.css (gitignored, like public/tokens.json
 * — regenerated every build, not a source file) rather than src/ — this
 * keeps the generated oklch() literals out of scripts/audit.mjs's default
 * site/src sweep, the same reason tokens.json is copied into public/
 * instead of imported from src/. The scoped palettes are still gated: each
 * one is self-verified at generation time by theme.mjs (issue #56's
 * "generation/contrast come from the existing bridge" scope line), and can
 * be re-audited directly with remarque-audit --palette (REMARQUE.md
 * "Palette Deck" documents the isLightRoot fix that makes that possible).
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const themeScript = join(here, '..', 'node_modules', 'remarque-tokens', 'scripts', 'theme.mjs');
const outDir = join(here, '..', 'public', 'palettes');
mkdirSync(outDir, { recursive: true });

const PAIRS = [
  { scope: 'gruvbox', light: 'gruvbox-light', dark: 'gruvbox-dark' },
  { scope: 'rose-pine', light: 'rose-pine-dawn', dark: 'rose-pine' },
];

for (const { scope, light, dark } of PAIRS) {
  const outFile = join(outDir, `${scope}.css`);
  execFileSync('node', [themeScript, light, '--dark', dark, '--scope', scope, '-o', outFile], {
    stdio: 'inherit',
  });
}

console.log(`build-palette-deck: wrote ${PAIRS.length} scoped palette(s) to ${outDir}`);
