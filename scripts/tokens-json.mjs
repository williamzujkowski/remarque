#!/usr/bin/env node
/*
 * Generates tokens.json (W3C design-tokens flavored) and tokens.d.ts
 * (TypeScript literal-union types) FROM the CSS — tokens-core.css and
 * tokens-palette.css remain the single source of truth; both files
 * here are derived output for tooling, AI agents, and TS editors.
 *
 *   node scripts/tokens-json.mjs           # (re)write tokens.json + tokens.d.ts
 *   node scripts/tokens-json.mjs --check   # exit 1 if either is stale (CI)
 *
 * Multi-theme values use per-token light/dark groups with $value on each
 * (the W3C spec has no native theming; this follows its $extensions
 * escape hatch conservatively).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { extractBlocks, declsOf, isLightRoot, isDarkBlock } from './lib/css-tokens.mjs';

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
const coreDecls = declsOf(extractBlocks(readFileSync('tokens-core.css', 'utf8')), isLightRoot);
const paletteBlocks = extractBlocks(readFileSync('tokens-palette.css', 'utf8'));
const lightDecls = declsOf(paletteBlocks, isLightRoot);
const darkOverrides = declsOf(paletteBlocks, isDarkBlock);

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

/* ── tokens.d.ts ──────────────────────────────────────────────────────
 * Literal-union types + a typed shape for tokens.json, generated from
 * the same in-memory `out` object that produces tokens.json — so the
 * two derived files can never disagree with each other, only (briefly,
 * until regenerated) with the CSS. The package ships no JS entry point;
 * this file exists purely for editors/TS consumers that either author
 * Remarque token names (`RemarqueToken`, `RemarqueCssVar`) or read
 * tokens.json programmatically (`RemarqueTokensFile`, wired via the
 * ambient `declare module 'remarque-tokens/tokens.json'` below).
 */
function tsLiteral(value) {
  return typeof value === 'number' ? String(value) : JSON.stringify(value);
}

function renderDts(tokens, pkgVersion) {
  const coreNames = Object.keys(tokens.core);
  const paletteNames = Object.keys(tokens.palette);

  const coreUnion = coreNames.map((n) => `  | '${n}'`).join('\n');
  const paletteUnion = paletteNames.map((n) => `  | '${n}'`).join('\n');

  const coreValues = coreNames
    .map((n) => `    readonly '${n}': ${tsLiteral(tokens.core[n].$value)};`)
    .join('\n');
  const paletteValues = paletteNames
    .map((n) => {
      const t = tokens.palette[n];
      return `    readonly '${n}': {\n      readonly light: ${tsLiteral(t.light.$value)};\n      readonly dark: ${tsLiteral(t.dark.$value)};\n    };`;
    })
    .join('\n');

  return `/*
 * Remarque design tokens — GENERATED from tokens.json by
 * scripts/tokens-json.mjs (v${pkgVersion}). Do not edit — the CSS
 * (tokens-core.css + tokens-palette.css) is the source of truth;
 * tokens.json is the intermediate machine-readable form this file is
 * generated from. Regenerate with: node scripts/tokens-json.mjs
 *
 * This package has no JS entry point — these types exist for editors
 * and TypeScript consumers that either author Remarque token names
 * (RemarqueToken, RemarqueCssVar) or read tokens.json programmatically
 * (RemarqueTokensFile / RemarqueTokenValues, and the ambient module
 * declaration below for \`import tokens from 'remarque-tokens/tokens.json'\`).
 */

/** All core-tier token names (tokens-core.css). Never overridden. */
export type RemarqueCoreToken =
${coreUnion};

/** All palette-tier token names (tokens-palette.css). The sanctioned personalization surface. */
export type RemarquePaletteToken =
${paletteUnion};

/** Every Remarque token name, core + palette. */
export type RemarqueToken = RemarqueCoreToken | RemarquePaletteToken;

/** A Remarque token name as its CSS custom-property form, e.g. \`--text-body\`. */
export type RemarqueCssVar = \`--${'$'}{RemarqueToken}\`;

/** W3C design-tokens \`$type\` values used across tokens.json. */
export type RemarqueTokenType =
  | 'color'
  | 'dimension'
  | 'number'
  | 'fontFamily'
  | 'fontWeight'
  | 'duration'
  | 'string';

/** Shape of a single core-tier entry in tokens.json's \`core\` map. */
export interface RemarqueCoreTokenEntry {
  readonly $value: string | number;
  readonly $type: RemarqueTokenType;
}

/** Shape of one theme side (\`light\`/\`dark\`) of a palette-tier entry. */
export interface RemarquePaletteTokenSideValue {
  readonly $value: string | number;
  readonly $extensions?: {
    readonly remarque?: {
      readonly inheritedFromLight?: boolean;
    };
  };
}

/** Shape of a single palette-tier entry in tokens.json's \`palette\` map. */
export interface RemarquePaletteTokenEntry {
  readonly $type: RemarqueTokenType;
  readonly light: RemarquePaletteTokenSideValue;
  readonly dark: RemarquePaletteTokenSideValue;
}

/**
 * Typed shape of tokens.json's default export — the whole generated
 * file, structurally. Use this when reading tokens.json dynamically
 * (\`JSON.parse\`, a bundler JSON import without the ambient module
 * below applying, etc).
 */
export interface RemarqueTokensFile {
  readonly $description: string;
  readonly $extensions: {
    readonly remarque: {
      readonly version: string;
      readonly tiers: {
        readonly core: string;
        readonly palette: string;
      };
    };
  };
  readonly core: { readonly [K in RemarqueCoreToken]: RemarqueCoreTokenEntry };
  readonly palette: { readonly [K in RemarquePaletteToken]: RemarquePaletteTokenEntry };
}

/**
 * The actual current value of every token, as literal types — precise
 * autocomplete for "what is \`--text-body\` right now", not just "what
 * are its shape and type". Regenerated alongside tokens.json, so these
 * literals track the live CSS across releases.
 */
export interface RemarqueTokenValues {
  readonly core: {
${coreValues}
  };
  readonly palette: {
${paletteValues}
  };
}

// Precise types for \`import tokens from 'remarque-tokens/tokens.json'\`
// (and any other bundler-JSON-import path resolving through this
// subpath) without depending on the consumer's \`resolveJsonModule\`.
declare module 'remarque-tokens/tokens.json' {
  const tokens: RemarqueTokensFile;
  export default tokens;
}
`;
}

const dts = renderDts(out, version);

if (process.argv.includes('--check')) {
  const currentJson = existsSync('tokens.json') ? readFileSync('tokens.json', 'utf8') : '';
  const currentDts = existsSync('tokens.d.ts') ? readFileSync('tokens.d.ts', 'utf8') : '';
  const staleJson = currentJson !== json;
  const staleDts = currentDts !== dts;
  if (staleJson || staleDts) {
    if (staleJson) console.error('tokens.json is stale — run: node scripts/tokens-json.mjs');
    if (staleDts) console.error('tokens.d.ts is stale — run: node scripts/tokens-json.mjs');
    process.exit(1);
  }
  console.log('tokens.json and tokens.d.ts are fresh ✓');
} else {
  writeFileSync('tokens.json', json);
  writeFileSync('tokens.d.ts', dts);
  console.log(`tokens.json + tokens.d.ts written — ${Object.keys(out.core).length} core + ${Object.keys(out.palette).length} palette tokens (v${version})`);
}
