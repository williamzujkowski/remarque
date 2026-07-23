#!/usr/bin/env node
/*
 * remarque-theme — derive a Remarque palette-tier override from an
 * @williamzujkowski/oklch-terminal-themes light+dark pair.
 *
 *   node scripts/theme.mjs <light-slug> --dark <dark-slug> [-o out.css]
 *   npx remarque-theme <light-slug> --dark <dark-slug> [-o out.css]
 *
 * Terminal themes carry only background/foreground/cursor/selection + 16
 * ANSI slots — most of Remarque's 15 semantic slots don't map directly,
 * and most themes fail the AAA fg-muted 7:1 line as authored. So this
 * DERIVES rather than maps: hue + chroma come from the theme (its
 * personality), lightness is solved per slot to hit the exact ratio
 * targets from REMARQUE.md's Enforcement Checklist (binary search over
 * L, with in-gamut chroma clamping inside the solver). Output passes
 * remarque-audit BY CONSTRUCTION — this script self-verifies the same
 * pairings before it will emit anything.
 *
 * Security (non-negotiable, per the panel security review on #75):
 *   - Both slugs are checked against the package's own index.json BEFORE
 *     any path is built from them — an unknown slug never reaches a
 *     require.resolve() or fs call. This is the actual guard against
 *     path traversal; the slug regex below is defense-in-depth, not the
 *     primary control.
 *   - Every OKLCH triplet read from theme JSON is validated as finite
 *     numbers (l in [0,1], c >= 0, h in [0,360)) before it touches any
 *     math. Malformed/hostile theme JSON fails loudly, never silently.
 *   - CSS is never built by string-interpolating raw JSON. Every number
 *     emitted has passed through our own rounding + validation first.
 */

import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const PKG_SPEC = '@williamzujkowski/oklch-terminal-themes';
const HERE = dirname(fileURLToPath(import.meta.url));
let OWN_VERSION = 'unknown';
try {
  OWN_VERSION = JSON.parse(readFileSync(join(HERE, '..', 'package.json'), 'utf8')).version;
} catch { /* provenance is best-effort */ }

const USAGE = `usage: remarque-theme <light-slug> --dark <dark-slug> [-o out.css]

  <light-slug>     slug of a theme with isDark=false in ${PKG_SPEC}
  --dark <slug>    slug of a theme with isDark=true (required — the
                    dataset has no light/dark pairing metadata yet, see
                    oklch-terminal-themes#128)
  -o, --output     write the derived palette here instead of stdout`;

function die(msg) {
  console.error(msg);
  process.exit(1);
}

/* ── CLI args ─────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
let darkSlug, outFile;
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--dark') darkSlug = argv[++i];
  else if (a === '-o' || a === '--output') outFile = argv[++i];
  else if (a === '-h' || a === '--help') { console.log(USAGE); process.exit(0); }
  else positional.push(a);
}
const lightSlug = positional[0];
if (!lightSlug || !darkSlug) die(USAGE);

/* ── Resolve @williamzujkowski/oklch-terminal-themes ─────────────────
 * Tried from the consumer's cwd first (a project that installs the
 * themes package at its own top level), then from this script's own
 * location (covers hoisting layouts where only remarque-tokens itself
 * declares the peerDependency). First resolvable wins. */

function tryResolveFrom(base) {
  try {
    const req = createRequire(base);
    const indexPath = req.resolve(`${PKG_SPEC}/index.json`);
    return { req, indexPath };
  } catch {
    return null;
  }
}

const resolved =
  tryResolveFrom(pathToFileURL(join(process.cwd(), 'package.json')).href) ||
  tryResolveFrom(import.meta.url);

if (!resolved) {
  die(
    `${PKG_SPEC} is not installed (checked from the current project and from remarque-tokens itself).\n\n` +
    `Install it and retry:\n  npm install ${PKG_SPEC}@0.1.0\n`
  );
}

const index = JSON.parse(readFileSync(resolved.indexPath, 'utf8'));
const bySlug = new Map((index.themes || []).map((t) => [t.slug, t]));

// Package root sits two directories above data/index.json; read its
// package.json for the provenance header directly via fs (not through
// "exports" — the package does not publish that subpath).
const themesPkgRoot = dirname(dirname(resolved.indexPath));
let themesVersion = 'unknown';
try {
  themesVersion = JSON.parse(readFileSync(join(themesPkgRoot, 'package.json'), 'utf8')).version;
} catch { /* provenance is best-effort */ }

/* ── Slug validation — the actual security boundary ──────────────────
 * A slug is only ever used to build a require specifier AFTER it has
 * been matched, byte-for-byte, against an entry in the package's own
 * index. Nothing user-supplied reaches require.resolve()/fs otherwise. */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function requireSlug(slug, label) {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug) || !bySlug.has(slug)) {
    die(`${label} slug "${slug}" is not a known theme in ${PKG_SPEC} (see its index.json for valid slugs)`);
  }
  return bySlug.get(slug);
}

const lightMeta = requireSlug(lightSlug, 'light');
const darkMeta = requireSlug(darkSlug, 'dark');
if (lightMeta.isDark !== false) die(`light slug "${lightSlug}" has isDark=${lightMeta.isDark}, expected false`);
if (darkMeta.isDark !== true) die(`dark slug "${darkSlug}" has isDark=${darkMeta.isDark}, expected true`);

function loadTheme(slug) {
  // Safe: slug has already been matched against the package's index above.
  const path = resolved.req.resolve(`${PKG_SPEC}/themes/${slug}.json`);
  return JSON.parse(readFileSync(path, 'utf8'));
}
const themeLight = loadTheme(lightSlug);
const themeDark = loadTheme(darkSlug);

/* ── Numeric validation ───────────────────────────────────────────── */

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

function validateOklch(o, where) {
  if (!o || !isNum(o.l) || o.l < 0 || o.l > 1) die(`${where}: invalid or missing OKLCH l (${o && o.l})`);
  if (!isNum(o.c) || o.c < 0) die(`${where}: invalid or missing OKLCH c (${o && o.c})`);
  if (!isNum(o.h) || o.h < 0 || o.h >= 360) die(`${where}: invalid or missing OKLCH h (${o && o.h})`);
  return [o.l, o.c, o.h];
}

function slotLch(theme, slot, label) {
  const entry = theme.colors && theme.colors[slot];
  if (!entry || !entry.oklch) die(`${label}: missing colors.${slot}.oklch`);
  return validateOklch(entry.oklch, `${label} colors.${slot}`);
}

/* ── OKLCH → sRGB → WCAG luminance (same Ottosson matrices as audit.mjs) */

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

const r3 = (x) => +x.toFixed(3);
const r1 = (x) => +x.toFixed(1);

/* Largest chroma <= C that stays in sRGB gamut at (L, H).
 * Round-then-verify (fixes the spike's bug, see #75): stepping in
 * unrounded space and only rounding the final answer can round a
 * borderline-in-gamut value back OUT of gamut (float rounding is not
 * gamut-aware). So after the coarse search we round, then keep backing
 * off in already-rounded steps until the ROUNDED value itself verifies. */
function fitChroma(L, C, H) {
  let c = Math.max(0, C);
  while (c > 0 && !inGamut(oklchToLinearSrgb(L, c, H))) c -= 0.001;
  c = Math.max(0, c);
  let rounded = r3(c);
  while (rounded > 0 && !inGamut(oklchToLinearSrgb(L, rounded, H))) rounded = r3(rounded - 0.001);
  return Math.max(0, rounded);
}

/* Solve lightness so [L, C', H] hits >= target ratio against bg.
 * dir 'darker': text on a light bg — find the MAX L that still passes
 * (stays closest to the theme's own feel). dir 'lighter': text on a
 * dark bg — find the MIN L. Chroma is clamped in-gamut INSIDE the
 * solver at every candidate L, and the final [L, C, H] is rounded, then
 * re-verified against the real (non-margin) target — nudging L further
 * in the safe direction if rounding cost just enough ratio to fail. */
function solveLOnce(C, H, bg, target, dir) {
  const searchTarget = target * 1.03; // margin over the audit threshold
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const c = fitChroma(mid, C, H);
    const passes = ratio([mid, c, H], bg) >= searchTarget;
    if (dir === 'darker') { if (passes) lo = mid; else hi = mid; }
    else { if (passes) hi = mid; else lo = mid; }
  }
  let L = r3(dir === 'darker' ? lo : hi);
  let c = fitChroma(L, C, H);
  let guard = 0;
  while (ratio([L, c, H], bg) < target && guard < 100) {
    const next = dir === 'darker' ? r3(L - 0.001) : r3(L + 0.001);
    if (next < 0 || next > 1 || next === L) break;
    L = next;
    c = fitChroma(L, C, H);
    guard++;
  }
  const ok = ratio([L, c, H], bg) >= target;
  return { L, C: c, H: r1(H), ok };
}

function solveL(C, H, bg, target, dir) {
  let r = solveLOnce(C, H, bg, target, dir);
  if (r.ok) return [r.L, r.C, r.H];
  // Chroma-collapse fallback: retry as a neutral if the chromatic
  // solve can't reach the target ratio at any lightness.
  r = solveLOnce(0, H, bg, target, dir);
  if (r.ok) return [r.L, r.C, r.H];
  die(
    `internal error: cannot solve lightness for a ${target}:1 target ` +
    `(hue ${H.toFixed(1)}, direction ${dir}) even with chroma collapsed to 0 — pathological theme colors`
  );
}

/* Accent hue: cursor if it's chromatic, else the most-chromatic classic ANSI. */
function accentHue(theme, label) {
  const cursor = theme.colors && theme.colors.cursor && theme.colors.cursor.oklch;
  if (cursor) {
    const [, c, h] = validateOklch(cursor, `${label} colors.cursor`);
    if (c >= 0.05) return { h, c, from: 'cursor' };
  }
  const names = ['blue', 'purple', 'red', 'green', 'cyan', 'yellow'];
  const cands = [];
  for (const name of names) {
    const o = theme.colors && theme.colors[name] && theme.colors[name].oklch;
    if (!o) continue;
    const [, c, h] = validateOklch(o, `${label} colors.${name}`);
    cands.push({ name, c, h });
  }
  if (!cands.length) die(`${label}: no classic ANSI colors available to derive an accent hue`);
  cands.sort((a, b) => b.c - a.c);
  return { h: cands[0].h, c: cands[0].c, from: cands[0].name };
}

function fmt(triple) {
  const [L, C, H] = triple;
  if (!isNum(L) || !isNum(C) || !isNum(H)) die('internal error: attempted to emit a non-finite color component');
  return `oklch(${L} ${C} ${H})`;
}

/* ── LIGHT derivation ─────────────────────────────────────────────── */

function deriveLight(t) {
  const [bgL0, bgC0, bgH0] = slotLch(t, 'background', 'light');
  const bgH = r1(bgH0);
  const bgL = r3(Math.max(bgL0, 0.93));
  const bgC = fitChroma(bgL, Math.min(bgC0, 0.02), bgH);
  const bg = [bgL, bgC, bgH];
  const surface = [r3(bgL - 0.01), bgC, bgH];
  const [, fgC0, fgH] = slotLch(t, 'foreground', 'light');
  const fgC = Math.min(fgC0, 0.03);
  const fg = solveL(fgC, fgH, surface, 10, 'darker');
  const fgMuted = solveL(fgC, fgH, bg, 7.0, 'darker');
  const muted = solveL(Math.min(fgC0, 0.02), fgH, surface, 4.5, 'darker');
  const borderBold = solveL(0.01, bgH, bg, 3.0, 'darker');
  const ac = accentHue(t, 'light');
  const acC = Math.min(ac.c, 0.14);
  const accent = solveL(acC, ac.h, bg, 4.5, 'darker');
  const accentHover = [r3(accent[0] - 0.08), fitChroma(r3(accent[0] - 0.08), acC * 0.8, ac.h), r1(ac.h)];
  const raw = {
    'color-bg': bg,
    'color-bg-subtle': [r3(bg[0] - 0.02), bg[1], bg[2]],
    'color-fg': fg,
    'color-fg-muted': fgMuted,
    'color-muted': muted,
    'color-border': [r3(bg[0] - 0.095), bg[1], bg[2]],
    'color-border-bold': borderBold,
    'color-surface': surface,
    'color-accent': accent,
    'color-accent-hover': accentHover,
    'color-accent-subtle': [0.95, fitChroma(0.95, 0.02, ac.h), r1(ac.h)],
    'color-selection-bg': [0.92, fitChroma(0.92, 0.04, ac.h), r1(ac.h)],
    'color-selection-fg': { ref: 'color-fg' },
    'color-code-bg': [r3(bg[0] - 0.03), bg[1], bg[2]],
    'color-code-fg': { ref: 'color-fg' },
  };
  const tokens = {};
  for (const [name, v] of Object.entries(raw)) tokens[name] = v.ref ? `var(--${v.ref})` : fmt(v);
  return { accentFrom: ac.from, accentH: ac.h, raw, tokens };
}

/* ── DARK derivation ──────────────────────────────────────────────── */

function deriveDark(t, accentHueLight) {
  const [bgL0, bgC0, bgH0] = slotLch(t, 'background', 'dark');
  const bgH = r1(bgH0);
  const bgL = r3(Math.min(Math.max(bgL0, 0.14), 0.22));
  const bgC = fitChroma(bgL, Math.min(bgC0, 0.03), bgH);
  const bg = [bgL, bgC, bgH];
  const surface = [r3(bg[0] + 0.03), bgC, bgH];
  const [, fgC0, fgH] = slotLch(t, 'foreground', 'dark');
  const fgC = Math.min(fgC0, 0.02);
  const fg = solveL(fgC, fgH, surface, 10, 'lighter');
  const fgMuted = solveL(fgC, fgH, bg, 7.0, 'lighter');
  const muted = solveL(fgC, fgH, surface, 4.5, 'lighter');
  const borderBold = solveL(0.01, bgH, bg, 3.0, 'lighter');
  const ac = accentHue(t, 'dark');
  const h = accentHueLight ?? ac.h; // keep hue consistent across the pair
  const acC = Math.min(ac.c, 0.12);
  const accent = solveL(acC, h, bg, 4.5, 'lighter');
  const accentHover = [r3(accent[0] + 0.07), fitChroma(r3(accent[0] + 0.07), acC, h), r1(h)];
  const selBg = [r3(bg[0] + 0.14), fitChroma(r3(bg[0] + 0.14), 0.06, h), r1(h)];
  const selFg = solveL(0.005, fgH, selBg, 4.5, 'lighter');
  const codeBg = [r3(bg[0] + 0.04), bgC, bgH];
  const codeFg = solveL(0.005, fgH, codeBg, 7, 'lighter');
  const raw = {
    'color-bg': bg,
    'color-bg-subtle': surface,
    'color-fg': fg,
    'color-fg-muted': fgMuted,
    'color-muted': muted,
    'color-border': [r3(bg[0] + 0.09), bg[1], bg[2]],
    'color-border-bold': borderBold,
    'color-surface': surface,
    'color-accent': accent,
    'color-accent-hover': accentHover,
    'color-accent-subtle': [r3(bg[0] + 0.06), fitChroma(r3(bg[0] + 0.06), 0.04, h), r1(h)],
    'color-selection-bg': selBg,
    'color-selection-fg': selFg,
    'color-code-bg': codeBg,
    'color-code-fg': codeFg,
  };
  const tokens = {};
  for (const [name, v] of Object.entries(raw)) tokens[name] = fmt(v);
  tokens['weight-display'] = '500';
  return { raw, tokens };
}

const light = deriveLight(themeLight);
const dark = deriveDark(themeDark, light.accentH);

/* ── Self-verify — the same pairings + gamut rule as scripts/audit.mjs,
 * run in-process against the raw [L,C,H] triples (mirrored here rather
 * than reparsing the CSS we're about to emit). This should be
 * impossible to fail; a failure means a bug in the derivation above,
 * not a bad input theme, so it errors as an internal error. */

const CHECKS = [
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
];

function resolveRaw(raw, name, seen = new Set()) {
  if (seen.has(name)) die(`internal error: circular var() chain at --${name}`);
  seen.add(name);
  const v = raw[name];
  if (v === undefined) die(`internal error: --${name} was never derived`);
  return v.ref ? resolveRaw(raw, v.ref, seen) : v;
}

function selfVerify(themeName, raw) {
  for (const [name, v] of Object.entries(raw)) {
    const triple = v.ref ? resolveRaw(raw, name) : v;
    if (!inGamut(oklchToLinearSrgb(...triple))) {
      die(`internal error: derived --${name} (${themeName}) oklch(${triple.join(' ')}) is outside sRGB gamut`);
    }
  }
  for (const [fgName, bgName, min, label] of CHECKS) {
    const fg = resolveRaw(raw, fgName);
    const bg = resolveRaw(raw, bgName);
    const r = ratio(fg, bg);
    if (r < min) {
      die(`internal error: derived --${fgName}/--${bgName} (${themeName}) = ${r.toFixed(2)}:1 < ${min}:1 (${label}) — this should be impossible; the derivation has a bug`);
    }
  }
}
selfVerify('light', light.raw);
selfVerify('dark', dark.raw);

/* ── Emit ─────────────────────────────────────────────────────────── */

const decls = (tokens, indent = '  ') => Object.entries(tokens).map(([k, v]) => `${indent}--${k}: ${v};`).join('\n');

const css = `/*
 * Generated by remarque-theme (remarque-tokens ${OWN_VERSION}) — DO NOT HAND-EDIT.
 * Regenerate instead: npx remarque-theme ${lightSlug} --dark ${darkSlug}
 *
 * Source themes (${PKG_SPEC}@${themesVersion}):
 *   light = "${lightSlug}"   dark = "${darkSlug}"
 *   accent hue derived from: ${light.accentFrom} (H=${light.accentH.toFixed(1)})
 *
 * Palette tier only (--color-*, --weight-display) — see REMARQUE.md
 * "Token Tiers" / "Color Providers". Self-verified against the same
 * contrast + gamut checks as remarque-audit before being emitted.
 */

:root {
${decls(light.tokens)}
  --weight-display: 400;
}

[data-theme="dark"] {
${decls(dark.tokens)}
}
`;

if (outFile) {
  writeFileSync(outFile, css);
  console.error(`remarque-theme: wrote ${outFile}`);
} else {
  process.stdout.write(css);
}
