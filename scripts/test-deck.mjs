#!/usr/bin/env node
/*
 * remarque-deck fixtures (0.31). The prebuilt curated deck in deck/ is
 * fresh and well-formed, every palette is scoped and light-dark()-shaped,
 * and the CLI rejects bad input. Run: node scripts/test-deck.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Ajv from 'ajv';

let bad = 0;
function expect(label, cond, detail = '') {
  console.log(`${cond ? '✓' : '✗'} ${label}${cond ? '' : ` — ${detail}`}`);
  if (!cond) bad++;
}
const run = (args) => {
  try {
    return { code: 0, out: execFileSync('node', ['scripts/deck.mjs', ...args], { encoding: 'utf8', stdio: 'pipe' }) };
  } catch (e) {
    return { code: e.status, out: `${e.stdout}${e.stderr}` };
  }
};

// 1. Freshness: deck/ is exactly what --curated generates from the pinned dataset.
const fresh = run(['--curated', '--out-dir', 'deck', '--check']);
expect('deck/ is fresh against the pinned dataset (remarque-deck --curated --check)', fresh.code === 0, fresh.out.trim().split('\n').pop());

// 2. Manifest shape.
const manifest = JSON.parse(readFileSync('deck/deck.json', 'utf8'));
const curated = JSON.parse(readFileSync('deck/curated.json', 'utf8')).palettes;
const OKLCH = '^oklch\\([\\d.]+ [\\d.]+ [\\d.]+\\)$';
const swatch = { type: 'object', required: ['bg', 'surface', 'fg', 'accent'], additionalProperties: false, properties: Object.fromEntries(['bg', 'surface', 'fg', 'accent'].map((k) => [k, { type: 'string', pattern: OKLCH }])) };
const validate = new Ajv({ allErrors: true }).compile({
  type: 'object',
  required: ['generatedBy', 'palettes'],
  properties: {
    generatedBy: { type: 'string' },
    palettes: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['name', 'label', 'light', 'dark', 'css', 'warnings', 'swatches'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
          label: { type: 'string', minLength: 1 },
          light: { type: 'string' },
          dark: { type: 'string' },
          css: { type: 'string', pattern: '^[a-z0-9-]+\\.css$' },
          warnings: { type: 'integer', minimum: 0 },
          swatches: { type: 'object', required: ['light', 'dark'], additionalProperties: false, properties: { light: swatch, dark: swatch } },
        },
      },
    },
  },
});
expect('deck/deck.json matches the manifest schema', validate(manifest), JSON.stringify(validate.errors));
expect('the manifest lists exactly the curated palettes, in order', JSON.stringify(manifest.palettes.map((p) => p.name)) === JSON.stringify(curated.map((p) => p.name)));
const darkDiffers = manifest.palettes.every((p) => p.swatches.light.bg !== p.swatches.dark.bg);
expect('every palette has distinct light and dark backgrounds (paired, not single-mode)', darkDiffers);

// 3. Every palette file: scoped at (0,3,0), one light-dark() block, no
//    [data-theme] block, picker swatches present, and in deck.css.
const deckCss = readFileSync('deck/deck.css', 'utf8');
for (const p of manifest.palettes) {
  const css = existsSync(`deck/${p.css}`) ? readFileSync(`deck/${p.css}`, 'utf8') : '';
  expect(`${p.name}: scoped :root:root[data-palette="${p.name}"], light-dark() colors, no [data-theme] block`,
    css.includes(`:root:root[data-palette="${p.name}"] {`) && /--color-bg: light-dark\(oklch/.test(css) && !css.includes('[data-theme='));
  expect(`${p.name}: picker swatches and inclusion in deck.css`, css.includes(`[data-palette-swatch="${p.name}"]`) && deckCss.includes(`[data-palette-swatch="${p.name}"]`));
}
expect('deck.css carries default swatches for the no-deck option', deckCss.includes('[data-palette-swatch="default"]'));

// 4. CLI behavior.
const dir = mkdtempSync(join(tmpdir(), 'remarque-deck-test-'));
expect('a malformed entry is rejected', run(['Not A Slug', '--out-dir', dir]).code === 1);
expect('a duplicate palette name is rejected', run(['nord-light=x', 'catppuccin-latte=x', '--out-dir', dir]).code === 1);
expect('an unknown slug fails the build', run(['no-such-theme-xyz', '--out-dir', dir]).code === 1);
const custom = run(['catppuccin-latte=cat', '--out-dir', dir, '--json']);
const cm = custom.code === 0 ? JSON.parse(custom.out) : null;
expect('a custom entry builds, audits and lands in the manifest', cm?.palettes?.[0]?.name === 'cat' && cm.palettes[0].dark === 'catppuccin-mocha', custom.out.slice(0, 200));
writeFileSync(join(dir, 'site.css'), ':root {\n  --color-bg: oklch(0.99 0.01 120);\n  --color-surface: oklch(0.97 0.01 120);\n  --color-fg: oklch(0.2 0.01 120);\n  --color-accent: oklch(0.5 0.1 30);\n}\n[data-theme="dark"] {\n  --color-bg: oklch(0.15 0.01 120);\n}\n');
const withDefault = run(['catppuccin-latte=cat', '--out-dir', dir, '--default', join(dir, 'site.css')]);
const defaultCss = withDefault.code === 0 ? readFileSync(join(dir, 'deck.css'), 'utf8') : '';
expect('--default <palette> takes the default swatches from the site palette, both themes',
  defaultCss.includes('--swatch-bg: light-dark(oklch(0.99 0.01 120), oklch(0.15 0.01 120));'), withDefault.out.slice(0, 200));

if (bad) { console.error(`\ntest-deck FAILED — ${bad} check(s)`); process.exit(1); }
console.log('\ntest-deck passed ✓');
