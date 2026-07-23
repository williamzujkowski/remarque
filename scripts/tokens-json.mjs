#!/usr/bin/env node
/*
 * Generates tokens.json (DTCG/W3C design-tokens flavored), tokens.d.ts
 * (TypeScript literal-union types), and tokens.schema.json (JSON Schema
 * draft 2020-12 for tokens.json) FROM the CSS — tokens-core.css and
 * tokens-palette.css remain the single source of truth; all three files
 * here are derived output for tooling, AI agents, and TS editors.
 *
 *   node scripts/tokens-json.mjs           # (re)write tokens.json + tokens.d.ts + tokens.schema.json
 *   node scripts/tokens-json.mjs --check   # exit 1 if any of the three is stale (CI)
 *
 * Multi-theme values use per-token light/dark groups with $value on each
 * (the DTCG/W3C spec has no native theming; this follows its $extensions
 * escape hatch conservatively). tokens.json is CONFORMANT IN SPIRIT with
 * the Design Tokens Community Group format ($value/$type on every token)
 * but has two deliberate divergences — see the `dtcg` block below and
 * REMARQUE.md's "DTCG Conformance" section for the full rationale and the
 * named ratification triggers that would close each gap.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { extractBlocks, declsOf, isLightRoot, isDarkBlock } from './lib/css-tokens.mjs';

function typeOf(name, value) {
  if (name.startsWith('color-')) return 'color';
  if (name.startsWith('font-')) return 'fontFamily';
  if (name.startsWith('weight-')) return 'fontWeight';
  if (name.startsWith('motion-') && /ms$/.test(value)) return 'duration';
  if (name.startsWith('leading-')) return 'number';
  if (name.startsWith('z-')) return 'number'; // unitless stacking-order integers, not a length
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

// Published alongside tokens.json/tokens.schema.json by the demo site
// (site/scripts/copy-tokens-json.mjs) — issue #99's "shadcn schema-URL
// precedent". Bump the path only in lockstep with an actual site move.
const SCHEMA_URL = 'https://williamzujkowski.github.io/remarque/tokens.schema.json';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const coreDecls = declsOf(extractBlocks(readFileSync('tokens-core.css', 'utf8')), isLightRoot);
const paletteBlocks = extractBlocks(readFileSync('tokens-palette.css', 'utf8'));
const lightDecls = declsOf(paletteBlocks, isLightRoot);
const darkOverrides = declsOf(paletteBlocks, isDarkBlock);

// DTCG conformance note (issue #99, ratified option ii): documented IN the
// generated artifact, not just in prose, so a future agent regenerating
// tokens.json can't lose it. Two deliberate divergences from the Design
// Tokens Community Group draft, each with a named ratification trigger —
// full conformance is gated on those drafts landing, not "someday soon."
const DTCG_NOTE = {
  conformance: 'partial — $value/$type present on every token (conformant in spirit); two deliberate structural divergences below',
  divergences: [
    {
      aspect: 'color-value-encoding',
      detail: 'Color $value is an oklch() CSS string, not the DTCG structured color object ({ colorSpace, components, alpha }).',
      gatedOn: 'DTCG color $type structured-value format ratifying',
    },
    {
      aspect: 'multi-mode-theming',
      detail: 'Palette-tier tokens nest per-token { light: {$value}, dark: {$value} } groups instead of a single $value plus a modes/resolver mechanism.',
      gatedOn: 'DTCG multi-mode / resolver draft ratifying',
    },
  ],
  note: 'Deliberate, not oversight — see REMARQUE.md "DTCG Conformance" for the argument. Do not "fix" these toward the current unratified drafts; re-derive from the CSS via scripts/tokens-json.mjs instead.',
};

const out = {
  $schema: SCHEMA_URL,
  $description: 'Remarque design tokens — GENERATED from tokens-core.css + tokens-palette.css by scripts/tokens-json.mjs. Do not edit; the CSS is the source of truth.',
  $extensions: {
    remarque: {
      version,
      tiers: {
        core: 'immutable identity — overriding forks the system',
        palette: 'sanctioned personalization surface — override freely, then run remarque-audit',
      },
      dtcg: DTCG_NOTE,
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
  readonly $schema: string;
  readonly $description: string;
  readonly $extensions: {
    readonly remarque: {
      readonly version: string;
      readonly tiers: {
        readonly core: string;
        readonly palette: string;
      };
      /** DTCG conformance note (issue #99) — see REMARQUE.md "DTCG Conformance". */
      readonly dtcg: {
        readonly conformance: string;
        readonly divergences: ReadonlyArray<{
          readonly aspect: string;
          readonly detail: string;
          readonly gatedOn: string;
        }>;
        readonly note: string;
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

/* ── tokens.schema.json ────────────────────────────────────────────────
 * JSON Schema draft 2020-12 describing tokens.json's ACTUAL shape —
 * generated (not hand-maintained) so it can never drift from what this
 * script emits. Token *names* are open (patternProperties on the
 * kebab-case grammar every generated name follows) rather than an
 * enumerated list of the current token set, so adding/removing a token
 * in the CSS doesn't require a schema edit — only its documented VALUE
 * shape ($value/$type, the light/dark palette grouping, the $extensions
 * escape hatches) is fixed.
 */
function renderSchema() {
  const kebabName = '^[a-z][a-z0-9-]*$';
  const scalarValue = { oneOf: [{ type: 'string' }, { type: 'number' }] };
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: SCHEMA_URL,
    title: 'Remarque design tokens (tokens.json)',
    description:
      'JSON Schema for remarque-tokens\' generated tokens.json — GENERATED by scripts/tokens-json.mjs, do not hand-edit. ' +
      'Conformant in spirit with the Design Tokens Community Group format ($value/$type on every token), with two ' +
      'deliberate divergences (oklch()-string color values; per-token light/dark nesting) — see the tokens.json ' +
      '$extensions.remarque.dtcg block and REMARQUE.md "DTCG Conformance" for the full rationale and ratification triggers.',
    type: 'object',
    additionalProperties: false,
    required: ['$description', '$extensions', 'core', 'palette'],
    properties: {
      // No format: 'uri' keyword — ajv's strict mode rejects unknown
      // formats without the separate ajv-formats package, and this
      // project deliberately keeps the schema-validation devDependency
      // surface to ajv alone (see scripts/test-types.mjs).
      $schema: { type: 'string' },
      $description: { type: 'string' },
      $extensions: {
        type: 'object',
        additionalProperties: false,
        required: ['remarque'],
        properties: {
          remarque: {
            type: 'object',
            additionalProperties: false,
            required: ['version', 'tiers', 'dtcg'],
            properties: {
              version: { type: 'string' },
              tiers: {
                type: 'object',
                additionalProperties: false,
                required: ['core', 'palette'],
                properties: { core: { type: 'string' }, palette: { type: 'string' } },
              },
              dtcg: {
                type: 'object',
                additionalProperties: false,
                required: ['conformance', 'divergences', 'note'],
                properties: {
                  conformance: { type: 'string' },
                  divergences: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['aspect', 'detail', 'gatedOn'],
                      properties: {
                        aspect: { type: 'string' },
                        detail: { type: 'string' },
                        gatedOn: { type: 'string' },
                      },
                    },
                  },
                  note: { type: 'string' },
                },
              },
            },
          },
        },
      },
      core: {
        type: 'object',
        additionalProperties: false,
        patternProperties: { [kebabName]: { $ref: '#/$defs/coreEntry' } },
      },
      palette: {
        type: 'object',
        additionalProperties: false,
        patternProperties: { [kebabName]: { $ref: '#/$defs/paletteEntry' } },
      },
    },
    $defs: {
      tokenType: {
        type: 'string',
        enum: ['color', 'dimension', 'number', 'fontFamily', 'fontWeight', 'duration', 'string'],
      },
      coreEntry: {
        type: 'object',
        additionalProperties: false,
        required: ['$value', '$type'],
        properties: { $value: scalarValue, $type: { $ref: '#/$defs/tokenType' } },
      },
      paletteSideValue: {
        type: 'object',
        additionalProperties: false,
        required: ['$value'],
        properties: {
          $value: scalarValue,
          $extensions: {
            type: 'object',
            additionalProperties: false,
            properties: {
              remarque: {
                type: 'object',
                additionalProperties: false,
                properties: { inheritedFromLight: { type: 'boolean' } },
              },
            },
          },
        },
      },
      paletteEntry: {
        type: 'object',
        additionalProperties: false,
        required: ['$type', 'light', 'dark'],
        properties: {
          $type: { $ref: '#/$defs/tokenType' },
          light: { $ref: '#/$defs/paletteSideValue' },
          dark: { $ref: '#/$defs/paletteSideValue' },
        },
      },
    },
  };
}

const schema = JSON.stringify(renderSchema(), null, 2) + '\n';

if (process.argv.includes('--check')) {
  const currentJson = existsSync('tokens.json') ? readFileSync('tokens.json', 'utf8') : '';
  const currentDts = existsSync('tokens.d.ts') ? readFileSync('tokens.d.ts', 'utf8') : '';
  const currentSchema = existsSync('tokens.schema.json') ? readFileSync('tokens.schema.json', 'utf8') : '';
  const staleJson = currentJson !== json;
  const staleDts = currentDts !== dts;
  const staleSchema = currentSchema !== schema;
  if (staleJson || staleDts || staleSchema) {
    if (staleJson) console.error('tokens.json is stale — run: node scripts/tokens-json.mjs');
    if (staleDts) console.error('tokens.d.ts is stale — run: node scripts/tokens-json.mjs');
    if (staleSchema) console.error('tokens.schema.json is stale — run: node scripts/tokens-json.mjs');
    process.exit(1);
  }
  console.log('tokens.json, tokens.d.ts, and tokens.schema.json are fresh ✓');
} else {
  writeFileSync('tokens.json', json);
  writeFileSync('tokens.d.ts', dts);
  writeFileSync('tokens.schema.json', schema);
  console.log(`tokens.json + tokens.d.ts + tokens.schema.json written — ${Object.keys(out.core).length} core + ${Object.keys(out.palette).length} palette tokens (v${version})`);
}
