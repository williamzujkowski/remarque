#!/usr/bin/env node
/*
 * Generates tokens.json (W3C design-tokens flavored) FROM the CSS —
 * tokens-core.css and tokens-palette.css remain the single source of
 * truth; this file is derived output for tooling and AI agents.
 *
 *   node scripts/tokens-json.mjs           # (re)write tokens.json
 *   node scripts/tokens-json.mjs --check   # exit 1 if tokens.json is stale (CI)
 *
 * Multi-theme values use per-token light/dark groups with $value on each
 * (the W3C spec has no native theming; this follows its $extensions
 * escape hatch conservatively).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

/* Brace-aware block extraction — kept in sync with scripts/audit.mjs
   (duplicated deliberately: audit.mjs is a CLI whose import would run
   its main; unifying them is tracked under issue #48's follow-ups). */
function extractBlocks(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [];
  function scan(text, context) {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf('{', i);
      if (open === -1) break;
      const prelude = text.slice(i, open).trim().replace(/^[;\s]+/, '');
      let depth = 1, j = open + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === '{') depth++;
        else if (text[j] === '}') depth--;
        j++;
      }
      const body = text.slice(open + 1, j - 1);
      if (prelude.startsWith('@')) scan(body, prelude);
      else blocks.push({ prelude, body, context });
      i = j;
    }
  }
  scan(src, '');
  return blocks;
}

function declsOf(blocks, filterFn) {
  const decls = {};
  for (const b of blocks) {
    if (!filterFn(b)) continue;
    for (const m of b.body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      decls[m[1]] = m[2].trim();
    }
  }
  return decls;
}

function typeOf(name, value) {
  if (name.startsWith('color-')) return 'color';
  if (name.startsWith('font-')) return 'fontFamily';
  if (name.startsWith('weight-')) return 'fontWeight';
  if (name.startsWith('motion-') && /ms$/.test(value)) return 'duration';
  if (name.startsWith('leading-')) return 'number';
  if (value === '0') return 'dimension';
  if (/(^|\s)(rem|px|em|%)/.test(value) || /^-?[\d.]+(rem|px|em)$/.test(value) || value.startsWith('clamp(')) return 'dimension';
  return 'string';
}

// W3C spec: number-like types carry numeric $value, not strings.
function valueFor(type, value) {
  if (type === 'number' || type === 'fontWeight') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return value;
}

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const coreDecls = declsOf(extractBlocks(readFileSync('tokens-core.css', 'utf8')), (b) => b.context === '' && b.prelude.includes(':root'));
const paletteBlocks = extractBlocks(readFileSync('tokens-palette.css', 'utf8'));
const lightDecls = declsOf(paletteBlocks, (b) => b.context === '' && b.prelude.includes(':root'));
const darkOverrides = declsOf(paletteBlocks, (b) =>
  (b.context.includes('prefers-color-scheme') && b.context.includes('dark') && b.prelude.includes(':root')) ||
  b.prelude.includes('[data-theme="dark"]')
);

const out = {
  $description: 'Remarque design tokens — GENERATED from tokens-core.css + tokens-palette.css by scripts/tokens-json.mjs. Do not edit; the CSS is the source of truth.',
  $extensions: {
    remarque: {
      version,
      tiers: {
        core: 'immutable identity — overriding forks the system',
        palette: 'sanctioned personalization surface — override freely, then run remarque-audit',
      },
    },
  },
  core: {},
  palette: {},
};

for (const [name, value] of Object.entries(coreDecls)) {
  const $type = typeOf(name, value);
  out.core[name] = { $value: valueFor($type, value), $type };
}
for (const [name, value] of Object.entries(lightDecls)) {
  const $type = typeOf(name, value);
  const token = { $type, light: { $value: valueFor($type, value) } };
  if (name in darkOverrides) token.dark = { $value: valueFor($type, darkOverrides[name]) };
  else token.dark = { $value: valueFor($type, value), $extensions: { remarque: { inheritedFromLight: true } } };
  out.palette[name] = token;
}

const json = JSON.stringify(out, null, 2) + '\n';

if (process.argv.includes('--check')) {
  const current = existsSync('tokens.json') ? readFileSync('tokens.json', 'utf8') : '';
  if (current !== json) {
    console.error('tokens.json is stale — run: node scripts/tokens-json.mjs');
    process.exit(1);
  }
  console.log('tokens.json is fresh ✓');
} else {
  writeFileSync('tokens.json', json);
  console.log(`tokens.json written — ${Object.keys(out.core).length} core + ${Object.keys(out.palette).length} palette tokens (v${version})`);
}
