#!/usr/bin/env node
/*
 * remarque audit — enforces REMARQUE.md's checklist mechanically.
 *
 *   node scripts/audit.mjs [--palette tokens-palette.css] [--src <dir>]
 *   npx remarque-audit --palette your-palette.css --src src
 *
 * Checks (exit 1 on any failure):
 *   1. CONTRAST — extracts custom properties from the palette file with a
 *      brace-aware scanner (light = top-level :root; dark = :root inside
 *      @media (prefers-color-scheme: dark) and/or [data-theme="dark"],
 *      cascaded over the light values), resolves var() aliases, and
 *      computes WCAG 2.x ratios via OKLCH → linear sRGB (Ottosson
 *      matrices, gamut-clipped) → relative luminance. Thresholds come
 *      from the spec's Enforcement Checklist. Unresolvable tokens in a
 *      required pairing are failures, not skips.
 *      Also fails on out-of-sRGB-gamut colors (browsers clip them, so
 *      the authored value is not what renders).
 *   2. FONT FLOOR — no font-size declaration below 0.8125rem / 13px in src.
 *   3. NO HARDCODED COLORS — no hex/rgb()/hsl() literals in src styles;
 *      oklch() literals are allowed only in token files.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractBlocks, declsOf, isLightRoot, isDarkBlock } from './lib/css-tokens.mjs';

const args = process.argv.slice(2);
function argOf(flag, dflt) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
}
const PALETTE = argOf('--palette', 'tokens-palette.css');
const SRC = argOf('--src', existsSync('site/src') ? 'site/src' : '.');

let failures = 0;
function fail(msg) {
  failures++;
  console.error(`  ✗ ${msg}`);
}

if (!existsSync(PALETTE)) {
  console.error(`palette file not found: ${PALETTE} (use --palette <file>)`);
  process.exit(1);
}
if (!existsSync(SRC)) {
  console.error(`src directory not found: ${SRC} (use --src <dir>)`);
  process.exit(1);
}

/* ── OKLCH → sRGB → WCAG luminance ──────────────────────── */

function oklchToLinearSrgb(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}
const inGamut = (rgb) => rgb.every((x) => x >= -0.0005 && x <= 1.0005);
const clip = (x) => Math.min(1, Math.max(0, x));
const luminance = (rgb) => {
  const [r, g, b] = rgb.map(clip);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
function ratio(c1, c2) {
  const l1 = luminance(oklchToLinearSrgb(...c1));
  const l2 = luminance(oklchToLinearSrgb(...c2));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const blocks = extractBlocks(readFileSync(PALETTE, 'utf8'));
const lightDecls = declsOf(blocks, isLightRoot);
const darkOverrides = declsOf(blocks, isDarkBlock);
if (Object.keys(lightDecls).length === 0) fail(`no top-level :root declarations found in ${PALETTE}`);
if (Object.keys(darkOverrides).length === 0) fail(`no dark-theme declarations found in ${PALETTE} (@media prefers-color-scheme: dark or [data-theme="dark"])`);
// CSS cascade: dark blocks override light; unset dark tokens inherit light values.
const darkDecls = { ...lightDecls, ...darkOverrides };

/* Resolve a token to [L, C, H], following var(--x) chains. Returns null
   (and records why) when unresolvable. */
function resolveColor(decls, name, seen = new Set()) {
  if (seen.has(name)) return { err: `circular var() chain at --${name}` };
  seen.add(name);
  const raw = decls[name];
  if (raw === undefined) return { err: `--${name} is not defined` };
  const varRef = raw.match(/^var\(\s*--([a-z0-9-]+)\s*\)$/);
  if (varRef) return resolveColor(decls, varRef[1], seen);
  const ok = raw.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/);
  if (ok) return { color: [+ok[1], +ok[2], +ok[3]] };
  return { err: `--${name} has unsupported value "${raw}" (expected oklch(L C H) or var(--token))` };
}

/* ── Contrast checks (from REMARQUE.md Enforcement Checklist) ── */

const CHECKS = [
  // [fg-token, bg-token, min-ratio, label]
  ['color-fg', 'color-bg', 4.5, 'primary text'],
  ['color-fg', 'color-surface', 4.5, 'primary text on surface'],
  ['color-fg-muted', 'color-bg', 7.0, 'secondary text (spec AAA line)'],
  ['color-muted', 'color-bg', 4.5, 'tertiary text'],
  ['color-muted', 'color-surface', 4.5, 'tertiary text on surface'],
  ['color-accent', 'color-bg', 4.5, 'links'],
  ['color-accent-hover', 'color-bg', 4.5, 'link hover'],
  ['color-code-fg', 'color-code-bg', 4.5, 'code text'],
  ['color-border-bold', 'color-bg', 3.0, 'functional borders (WCAG 1.4.11)'],
  ['color-selection-fg', 'color-selection-bg', 4.5, 'selected text'],
  ['color-syntax-keyword', 'color-code-bg', 4.5, 'syntax: keyword'],
  ['color-syntax-string', 'color-code-bg', 4.5, 'syntax: string'],
  ['color-syntax-constant', 'color-code-bg', 4.5, 'syntax: constant'],
  ['color-syntax-comment', 'color-code-bg', 4.5, 'syntax: comment'],
  ['color-syntax-function', 'color-code-bg', 4.5, 'syntax: function'],
  ['color-syntax-type', 'color-code-bg', 4.5, 'syntax: type'],
  ['color-syntax-punctuation', 'color-code-bg', 4.5, 'syntax: punctuation'],
  ['color-syntax-variable', 'color-code-bg', 4.5, 'syntax: variable'],
  ['color-syntax-link', 'color-code-bg', 4.5, 'syntax: link'],
  // Semantic state colors (issue #26) — feedback moments, not decoration.
  ['color-error', 'color-bg', 4.5, 'state: error text'],
  ['color-error', 'color-surface', 4.5, 'state: error text on surface'],
  ['color-success', 'color-bg', 4.5, 'state: success text'],
  ['color-success', 'color-surface', 4.5, 'state: success text on surface'],
  ['color-warning', 'color-bg', 4.5, 'state: warning text'],
  ['color-warning', 'color-surface', 4.5, 'state: warning text on surface'],
  ['color-disabled', 'color-bg', 4.5, 'state: disabled text'],
  ['color-disabled', 'color-surface', 4.5, 'state: disabled text on surface'],
  // -subtle banner backgrounds: the pairing that matters is --color-fg on
  // the subtle background (callout/banner body text), not the state color.
  ['color-fg', 'color-error-subtle', 4.5, 'state: fg on error-subtle banner bg'],
  ['color-fg', 'color-success-subtle', 4.5, 'state: fg on success-subtle banner bg'],
  ['color-fg', 'color-warning-subtle', 4.5, 'state: fg on warning-subtle banner bg'],
];

for (const [themeName, decls] of [['light', lightDecls], ['dark', darkDecls]]) {
  console.log(`\n${themeName} theme (${PALETTE})`);
  // gamut check on every color-valued token
  for (const name of Object.keys(decls)) {
    const r = resolveColor(decls, name);
    if (r.color && !inGamut(oklchToLinearSrgb(...r.color))) {
      fail(`--${name} oklch(${r.color.join(' ')}) is outside sRGB gamut — browsers will clip it; author an in-gamut value`);
    }
  }
  for (const [fgName, bgName, min, label] of CHECKS) {
    const fg = resolveColor(decls, fgName);
    const bg = resolveColor(decls, bgName);
    if (fg.err || bg.err) {
      fail(`${fgName}/${bgName} (${label}): ${fg.err || bg.err}`);
      continue;
    }
    const r = ratio(fg.color, bg.color);
    if (r < min) fail(`${fgName}/${bgName} = ${r.toFixed(2)}:1 < ${min}:1 (${label})`);
    else console.log(`  ✓ ${fgName}/${bgName} = ${r.toFixed(2)}:1 (${label})`);
  }
}

/* ── Source scans ───────────────────────────────────────── */

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(css|astro|svelte|jsx|tsx|html)$/.test(name)) yield p;
  }
}

console.log(`\nsource scans (${SRC})`);
const FONT_FLOOR_REM = 0.8125, FONT_FLOOR_PX = 13;
// tokens.astro is the token *reference page* — its job is displaying literal
// values (issue #48 tracks generating it from a machine-readable source).
// The file passed via --palette is BY DEFINITION a token file, whatever
// its name (a consumer's palette is often global.css or similar).
const paletteRel = relative('.', PALETTE);
const isTokenFile = (p) =>
  p === paletteRel ||
  /tokens(-core|-palette)?\.css$|fonts\.css$|globals?\.css$|theme-deck\.css$|print\.css$|pages[\/\\]tokens\.astro$/.test(p);

for (const file of walk(SRC)) {
  const rel = relative('.', file);
  // Strip comments before scanning, preserving line numbers — otherwise
  // prose like "(issue #324)" in a comment trips the hex-color regex.
  const text = readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    // 2. font-size floor (static rem/px values), plus statically
    // unverifiable sizes (% / clamp) outside token files — those bypass
    // any floor check, so require the type-scale tokens instead.
    for (const m of line.matchAll(/font-size:\s*([\d.]+)(rem|px)/g)) {
      const v = parseFloat(m[1]);
      if ((m[2] === 'rem' && v < FONT_FLOOR_REM) || (m[2] === 'px' && v < FONT_FLOOR_PX)) {
        fail(`${rel}:${i + 1} font-size ${m[1]}${m[2]} below the 13px floor`);
      }
    }
    if (!isTokenFile(rel) && /font-size:\s*(clamp\(|[\d.]+%)/.test(line)) {
      fail(`${rel}:${i + 1} statically unverifiable font-size (clamp/%) — use var(--text-*) tokens: ${line.trim().slice(0, 80)}`);
    }
    // 3. hardcoded colors (hex / rgb / hsl anywhere; oklch outside token files).
    // Note: hex fills/strokes in inline SVG are flagged deliberately —
    // Remarque icons use currentColor, per the no-hardcoded-colors rule.
    if (/(#[0-9a-fA-F]{3,8}\b(?![0-9a-zA-Z]))|(\brgba?\()|(\bhsla?\()/.test(line) && !/xmlns|href|url\(#|\{#/.test(line)) {
      fail(`${rel}:${i + 1} hardcoded hex/rgb/hsl color: ${line.trim().slice(0, 80)}`);
    }
    if (!isTokenFile(rel) && /\boklch\(/.test(line) && !line.includes('var(--')) {
      fail(`${rel}:${i + 1} oklch() literal outside token files: ${line.trim().slice(0, 80)}`);
    }
  });
}

if (failures) {
  console.error(`\naudit FAILED — ${failures} problem(s)\n`);
  process.exit(1);
}
console.log('\naudit passed ✓\n');
