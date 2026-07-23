#!/usr/bin/env node
/*
 * remarque-theme — derive a Remarque palette-tier override from an
 * @williamzujkowski/oklch-terminal-themes light+dark pair.
 *
 *   node scripts/theme.mjs <light-slug> --dark <dark-slug> [-o out.css]
 *   npx remarque-theme <light-slug> --dark <dark-slug> [-o out.css]
 *
 * Terminal themes carry only background/foreground/cursor/selection + 16
 * ANSI slots — most of Remarque's 24 semantic slots don't map directly,
 * and most themes fail the AAA fg-muted 7:1 line as authored. So this
 * DERIVES rather than maps: hue + chroma come from the theme (its
 * personality); lightness is KEEP-IF-PASSING — a few load-bearing slots
 * (fg, accent, accent-hover, and dark's selection-fg/code-fg) keep the
 * theme's own authored lightness when it already clears the slot's
 * ratio target, and are solved by binary search ONLY when it doesn't.
 * A well-designed input theme comes through close to its own feel
 * instead of being flattened to the exact threshold; a theme that fails
 * still gets a value that passes, same as before (#76). Every other
 * slot (fg-muted, muted, border-bold, the bg ladder, selection-bg,
 * accent-subtle) is solved/derived as before — those don't have a
 * meaningful "theme's own value" to preserve. The 9 --color-syntax-*
 * slots (issue #53) are derived straight from the theme's 16 ANSI
 * colors instead — see the "Syntax-highlighting slots" section below.
 * The 6 --color-viz-* categorical slots (issue #94) are derived from
 * the dataset's own dataviz.categorical block (0.5.0+) instead of ANSI —
 * see "Dataviz categorical slots" below, including its dataset-predates-
 * the-field fallback (a clean error, not a synthesized guess).
 * Output passes remarque-audit BY CONSTRUCTION — this script
 * self-verifies the same pairings before it will emit anything.
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

const USAGE = `usage: remarque-theme <light-slug> [--dark <dark-slug>] [-o out.css] [--scope <name>] [--dataviz]

  <light-slug>     slug of a theme with isDark=false in ${PKG_SPEC}
  --dark <slug>    slug of a theme with isDark=true; defaults to the light
                    theme's "counterpart" from the dataset (0.2.0+) when it
                    has one, and is required when it doesn't
  -o, --output     write the derived palette here instead of stdout
  --dataviz        also emit --viz-sequential-N / --viz-diverging-N custom
                    properties from the dataset's dataviz.sequential/
                    .diverging ramps (0.5.0+ only; issue #94). These are
                    advisory, per-use ramps, NOT identity tokens — they are
                    not audited or golden-gated like --color-viz-1..6
  --scope <name>   emit under [data-palette="<name>"] instead of :root — for
                    the palette-deck module (remarque-tokens/deck), where
                    several generated palettes coexist in one stylesheet and
                    are switched at runtime. <name> is validated with the
                    same slug grammar as a theme slug (lowercase
                    alphanumeric + hyphen) — it is interpolated into a CSS
                    attribute selector, so it goes through the same
                    byte-for-byte validation as light-slug/dark-slug above,
                    not just a shape check (see "Security" above)`;

function die(msg) {
  console.error(msg);
  process.exit(1);
}

/* ── CLI args ─────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
let darkSlug, outFile, scopeName, dataviz = false;
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--dark') darkSlug = argv[++i];
  else if (a === '-o' || a === '--output') outFile = argv[++i];
  else if (a === '--scope') scopeName = argv[++i];
  else if (a === '--dataviz') dataviz = true;
  else if (a === '-h' || a === '--help') { console.log(USAGE); process.exit(0); }
  else positional.push(a);
}
const lightSlug = positional[0];
if (!lightSlug) die(USAGE);

/* --scope is interpolated into a CSS attribute selector
 * ([data-palette="<name>"]) — validated against the SAME slug grammar as
 * light-slug/dark-slug below (SLUG_RE), not a looser check. Unlike those
 * two, there's no upstream index to match it against (a scope name is the
 * caller's own label, not a theme lookup key), so the regex IS the whole
 * control here — which is exactly why it stays as strict as the lookup
 * keys' defense-in-depth regex: lowercase alphanumeric + hyphen only,
 * nothing that could break out of the quoted attribute value or inject
 * additional CSS. */
const SCOPE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
if (scopeName !== undefined && !SCOPE_RE.test(scopeName)) {
  die(`--scope "${scopeName}" is invalid — must be lowercase alphanumeric segments joined by single hyphens (e.g. "gruvbox", "rose-pine")`);
}

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
/* --dark defaults to the dataset's counterpart field (0.2.0+). The value
 * still goes through requireSlug like a user-supplied one — a dataset
 * entry is not trusted further than the CLI arg it replaces. */
if (!darkSlug) {
  darkSlug = lightMeta.counterpart;
  if (!darkSlug) {
    die(
      `"${lightSlug}" has no counterpart in the installed ${PKG_SPEC} dataset — ` +
      `pass --dark <slug> explicitly (or upgrade the dataset; pairing metadata landed in 0.2.0)`
    );
  }
}
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

/* Accent source: cursor if it's chromatic, else the most-chromatic classic
 * ANSI. Carries l too (not just h/c) — keep-if-passing needs the source's
 * own lightness as the candidate to test before falling back to solveL. */
function accentHue(theme, label) {
  // Dataset 0.3.0+ publishes a curated/computed accent per theme — prefer
  // it (it's this same heuristic, computed upstream where it can be
  // curated per-theme). Validated like any other theme color; the local
  // heuristic below stays as the fallback for older datasets.
  if (theme.accent && theme.accent.oklch) {
    const [l, c, h] = validateOklch(theme.accent.oklch, `${label} accent`);
    return { l, c, h, from: `accent:${String(theme.accent.source)}` };
  }
  const cursor = theme.colors && theme.colors.cursor && theme.colors.cursor.oklch;
  if (cursor) {
    const [l, c, h] = validateOklch(cursor, `${label} colors.cursor`);
    if (c >= 0.05) return { l, h, c, from: 'cursor' };
  }
  const names = ['blue', 'purple', 'red', 'green', 'cyan', 'yellow'];
  const cands = [];
  for (const name of names) {
    const o = theme.colors && theme.colors[name] && theme.colors[name].oklch;
    if (!o) continue;
    const [l, c, h] = validateOklch(o, `${label} colors.${name}`);
    cands.push({ name, l, c, h });
  }
  if (!cands.length) die(`${label}: no classic ANSI colors available to derive an accent hue`);
  cands.sort((a, b) => b.c - a.c);
  return { l: cands[0].l, h: cands[0].h, c: cands[0].c, from: cands[0].name };
}

/* Keep-if-passing: if the theme's own (quantized) lightness at this slot
 * already clears `target` against `bg`, keep it (chroma gamut-clamped,
 * hue rounded) — no margin, this is the theme's own value, not a solve.
 * Only when it fails do we fall back to solveL, which keeps its existing
 * ×1.03 search margin. `dir` only matters for that fallback path. */
function keepOrSolve(L0, C, H, bg, target, dir) {
  // Clamp into the valid domain first — an offset candidate (accent-hover,
  // dark selection-fg/code-fg) can walk L past 0/1 for a theme whose own
  // slot already sits near an extreme; ratio()'s luminance clip() would
  // otherwise let an out-of-[0,1] L "pass" here only to fail the raw
  // gamut check downstream in selfVerify.
  const L = Math.min(1, Math.max(0, r3(L0)));
  const c = fitChroma(L, C, H);
  if (ratio([L, c, H], bg) >= target) return [L, c, r1(H)];
  return solveL(C, H, bg, target, dir);
}

function fmt(triple) {
  const [L, C, H] = triple;
  if (!isNum(L) || !isNum(C) || !isNum(H)) die('internal error: attempted to emit a non-finite color component');
  return `oklch(${L} ${C} ${H})`;
}

/* Push a solved triple further from the background by delta L — headroom
 * over the legal minimum for slots that shouldn't sit at it (functional
 * borders at exactly 3:1 are fragile against antialiasing; AAA text at
 * exactly 7:1 has no margin for rendering variance). Direction is always
 * away from bg, so the ratio only increases — never re-verified against
 * the target, only re-clamped for gamut. */
function withHeadroom([L0, , H], delta, dir, C) {
  const L = r3(Math.min(1, Math.max(0, dir === 'darker' ? L0 - delta : L0 + delta)));
  return [L, fitChroma(L, C, H), r1(H)];
}

/* ── Syntax-highlighting slots (issue #53) ───────────────────────────
 * Terminal ANSI colors ARE syntax colors in their native domain, so the
 * 9 --color-syntax-* slots are derived straight from a theme's 16 ANSI
 * colors rather than invented fresh — zero new upstream schema work.
 * Every slot targets --color-code-bg (not --color-bg) at 4.5:1, same
 * keep-if-passing-else-solve pattern as every other slot above: the
 * ANSI color's own lightness is kept when it already clears the ratio,
 * solved (same binary search, same in-gamut chroma clamping) only when
 * it doesn't. Chroma is capped at 0.14 — the same ceiling already used
 * for --color-accent — so syntax colors stay in the system's "quiet,
 * one-accent" register rather than turning carnival-bright. */

const SYNTAX_CHROMA_CAP = 0.14;

/* keyword/string/constant/function/type: a direct ANSI slot, kept if it
 * already passes vs code-bg, solved (same hue) if it doesn't. */
function deriveSyntaxAnsi(t, ansiName, label, codeBg, dir) {
  const [L0, C0, H0] = slotLch(t, ansiName, label);
  const C = Math.min(C0, SYNTAX_CHROMA_CAP);
  return keepOrSolve(L0, C, H0, codeBg, 4.5, dir);
}

/* comment: brightBlack in dark themes (the ANSI convention); in light
 * themes brightBlack is often too pale to hold 4.5:1 on code-bg, so the
 * fallback solves a muted neutral on the theme's own fg hue instead of
 * brightBlack's hue. */
function deriveSyntaxComment(t, label, codeBg, dir, fallbackC, fallbackH) {
  const [L0, C0, H0] = slotLch(t, 'brightBlack', label);
  const C = Math.min(C0, SYNTAX_CHROMA_CAP);
  const L = r3(Math.min(1, Math.max(0, L0)));
  const c = fitChroma(L, C, H0);
  if (ratio([L, c, H0], codeBg) >= 4.5) return [L, c, r1(H0)];
  return solveL(fallbackC, fallbackH, codeBg, 4.5, dir);
}

/* punctuation: a derived neutral in the muted family (fg hue, low
 * chroma), targeted at code-bg rather than surface. */
function deriveSyntaxPunctuation(fgC, fgH, codeBg, dir) {
  return solveL(Math.min(fgC, 0.02), fgH, codeBg, 4.5, dir);
}

/* variable: fg-adjacent — the theme's own fg hue/chroma, offset a little
 * so it reads as "quieter than plain text," verified (and solved if
 * needed) against code-bg rather than assumed from the fg/surface pass. */
function deriveSyntaxVariable(fg, codeBg, dir, offset) {
  return keepOrSolve(fg[0] + offset, fg[1], fg[2], codeBg, 4.5, dir);
}

/* link: alias the already-derived accent triple when it clears 4.5:1 on
 * code-bg (accent is only guaranteed against --color-bg, and code-bg
 * sits a little off from bg, so this isn't automatic) — solve a
 * standalone value at the accent's own hue/chroma only when it doesn't,
 * same as every other slot. Aliasing means a site's accent-hue swap
 * (REMARQUE.md "Changing the Accent Hue") carries the link color with
 * it for free whenever the alias holds. */
function deriveSyntaxLink(accent, codeBg, dir) {
  if (ratio(accent, codeBg) >= 4.5) return { ref: 'color-accent' };
  return keepOrSolve(accent[0], accent[1], accent[2], codeBg, 4.5, dir);
}

/* ── Semantic state colors (issue #26) ────────────────────────────────
 * error/success/warning are derived from the theme's red/green/yellow ANSI
 * slots — the same "ANSI colors already carry this domain's personality"
 * argument as the syntax slots above, applied to feedback-moment colors
 * instead of code tokens. Unlike every other keep-if-passing slot, the
 * target here is TWO backgrounds at once (--color-bg and --color-surface,
 * per the #26 scope comment: "keep-if-passing vs both") — a state color
 * must hold 4.5:1 against whichever of the two is stricter, not just one.
 * disabled is NOT ANSI — it aliases the already-derived neutral muted
 * family, same as tokens-palette.css's hand-authored default.
 */

/* Dual-target variant of keepOrSolve/solveL: passes only when BOTH bg and
 * surface clear `target` at the candidate L. Mirrors their guarded-nudge
 * fallback shape, just checking two ratios instead of one. */
function solveLDual(C, H, bg, surface, target, dir) {
  const searchTarget = target * 1.03;
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const c = fitChroma(mid, C, H);
    const passes = ratio([mid, c, H], bg) >= searchTarget && ratio([mid, c, H], surface) >= searchTarget;
    if (dir === 'darker') { if (passes) lo = mid; else hi = mid; }
    else { if (passes) hi = mid; else lo = mid; }
  }
  let L = r3(dir === 'darker' ? lo : hi);
  let c = fitChroma(L, C, H);
  let guard = 0;
  while ((ratio([L, c, H], bg) < target || ratio([L, c, H], surface) < target) && guard < 100) {
    const next = dir === 'darker' ? r3(L - 0.001) : r3(L + 0.001);
    if (next < 0 || next > 1 || next === L) break;
    L = next;
    c = fitChroma(L, C, H);
    guard++;
  }
  const ok = ratio([L, c, H], bg) >= target && ratio([L, c, H], surface) >= target;
  if (ok) return { L, C: c, H: r1(H), ok };
  return { L, C: c, H: r1(H), ok: false };
}

function solveDual(C, H, bg, surface, target, dir) {
  let r = solveLDual(C, H, bg, surface, target, dir);
  if (r.ok) return [r.L, r.C, r.H];
  // Chroma-collapse fallback, same rationale as solveL's.
  r = solveLDual(0, H, bg, surface, target, dir);
  if (r.ok) return [r.L, r.C, r.H];
  die(
    `internal error: cannot solve a state color for a ${target}:1 target against both bg and surface ` +
    `(hue ${H.toFixed(1)}, direction ${dir}) even with chroma collapsed to 0 — pathological theme colors`
  );
}

/* keep-if-passing against BOTH bg and surface at once. */
function keepOrSolveDual(L0, C, H, bg, surface, target, dir) {
  const L = Math.min(1, Math.max(0, r3(L0)));
  const c = fitChroma(L, C, H);
  if (ratio([L, c, H], bg) >= target && ratio([L, c, H], surface) >= target) return [L, c, r1(H)];
  return solveDual(C, H, bg, surface, target, dir);
}

const STATE_CHROMA_CAP = 0.14; // same restrained ceiling as --color-accent / syntax slots

function deriveStateColor(t, ansiName, label, bg, surface, dir) {
  const [L0, C0, H0] = slotLch(t, ansiName, label);
  const C = Math.min(C0, STATE_CHROMA_CAP);
  return keepOrSolveDual(L0, C, H0, bg, surface, 4.5, dir);
}

/* -subtle companions: near-bg lightness (mirrors --color-accent-subtle
 * EXACTLY — same fixed 0.95 / bg+0.06 starting points, not a theme-
 * relative "bg's own lightness" — accent-subtle is the identity this
 * mirrors, and its light-side constant is 0.95 regardless of how high a
 * given theme's own solved bg lightness lands), state hue, low chroma —
 * verified so --color-fg stays >= 4.5:1 on the result (the pairing that
 * matters for a callout/banner's body text), not re-verified against bg/
 * surface (it's a background, not a text color). `dir` 'darker' (light
 * theme): subtle starts at 0.95. 'lighter' (dark theme): subtle starts at
 * bg + 0.06. Nudged further toward the extreme (whiter in light, blacker
 * in dark) only if a pathological theme's hue/chroma combination doesn't
 * already clear 4.5:1 against fg at that starting lightness. */
function deriveStateSubtle(bgL, H, chromaCap, fg, dir) {
  let L = dir === 'darker' ? 0.95 : r3(Math.min(bgL + 0.06, 1));
  let c = fitChroma(L, chromaCap, H);
  let guard = 0;
  while (ratio(fg, [L, c, H]) < 4.5 && guard < 200) {
    L = dir === 'darker' ? r3(Math.min(1, L + 0.001)) : r3(Math.max(0, L - 0.001));
    c = fitChroma(L, chromaCap, H);
    guard++;
  }
  if (ratio(fg, [L, c, H]) < 4.5) {
    die(`internal error: cannot solve a state-subtle background (hue ${H.toFixed(1)}, dir ${dir}) that holds --color-fg >= 4.5:1 — pathological theme colors`);
  }
  return [L, c, r1(H)];
}

/* ── Dataviz categorical slots (issue #94) ────────────────────────────
 * The upstream dataset (0.5.0+) ships a per-theme `dataviz.categorical`
 * array — 6-8 ordered ColorValues already selected upstream for mutual
 * distinguishability, the same kind of "this domain already carries the
 * personality" argument as the syntax slots' ANSI colors. --color-viz-1
 * through --color-viz-6 take the first 6 (633/633 corpus themes ship at
 * least 6; 516 ship exactly 6 — that floor is why 6 ships, not 8), kept-
 * if-passing/solved the same way as every other slot, verified against
 * --color-bg (not --color-surface) at 3:1 — Carbon's mark-vs-background
 * line, not text's 4.5:1 (REMARQUE.md "Dataviz Tokens": these are chart
 * marks read at a glance, not prose read continuously).
 *
 * Order is taken as-is from the dataset, per theme independently — it is
 * NOT reconciled to match hue-for-hue between a light/dark pair (the
 * upstream categorical order does not always agree across a pair's two
 * halves; verified empirically against remarque-light/remarque-dark).
 * This is the same "dark mode is independently tuned, not inverted"
 * stance the rest of this file already takes for every other slot.
 *
 * Fallback: a dataset older than 0.5.0 (still legal under this package's
 * `>=0.1.0` peerDependencies floor) has no dataviz block at all. Rather
 * than reverse-engineer the upstream's undocumented categorical-
 * selection algorithm from raw ANSI colors — which could silently
 * diverge from what a real 0.5.0+ dataset actually ships — this errors
 * loudly and points at the upgrade. The smaller, honest option.
 */

const VIZ_CHROMA_CAP = 0.14; // same restrained ceiling as accent/syntax/state
const VIZ_TARGET = 3.0; // Carbon's mark-on-background line

function deriveVizCategorical(t, label, slug, bg, dir) {
  const cats = t.dataviz && Array.isArray(t.dataviz.categorical) ? t.dataviz.categorical : null;
  if (!cats || cats.length < 6) {
    die(
      `${label} theme "${slug}" has no dataviz.categorical (or fewer than 6 entries) in the installed ` +
      `${PKG_SPEC}@${themesVersion} — upgrade the dataset to >=0.5.0 (dataviz.categorical landed there; issue #94) ` +
      `and retry.\nremarque-theme does NOT synthesize a categorical ramp from raw ANSI colors as a fallback — the ` +
      `upstream categorical-selection algorithm is undocumented, so approximating it here could silently diverge ` +
      `from what a real 0.5.0+ dataset ships. Erroring with an upgrade instruction is the smaller, honest option.`
    );
  }
  return cats.slice(0, 6).map((entry, i) => {
    const [L0, C0, H0] = validateOklch(entry.oklch, `${label} dataviz.categorical[${i}]`);
    const C = Math.min(C0, VIZ_CHROMA_CAP);
    return keepOrSolve(L0, C, H0, bg, VIZ_TARGET, dir);
  });
}

/* ── LIGHT derivation ─────────────────────────────────────────────── */

function deriveLight(t) {
  const [bgL0, bgC0, bgH0] = slotLch(t, 'background', 'light');
  const bgH = r1(bgH0);
  const bgL = r3(Math.max(bgL0, 0.93));
  const bgC = fitChroma(bgL, Math.min(bgC0, 0.02), bgH);
  const bg = [bgL, bgC, bgH];
  const surface = [r3(bgL - 0.01), bgC, bgH];
  const [fgL0, fgC0, fgH] = slotLch(t, 'foreground', 'light');
  const fgC = Math.min(fgC0, 0.03);
  // fg: keep the theme's own foreground lightness if it already clears the
  // AAA floor (7:1) against surface; solve only if it doesn't (#76 — this
  // used to always solve to 10:1, flattening well-designed themes).
  const fg = keepOrSolve(fgL0, fgC, fgH, surface, 7.0, 'darker');
  const fgMuted = withHeadroom(solveL(fgC, fgH, bg, 7.0, 'darker'), 0.01, 'darker', fgC);
  const muted = solveL(Math.min(fgC0, 0.02), fgH, surface, 4.5, 'darker');
  const borderBold = withHeadroom(solveL(0.01, bgH, bg, 3.0, 'darker'), 0.02, 'darker', 0.01);
  const ac = accentHue(t, 'light');
  const acC = Math.min(ac.c, 0.14);
  // accent: keep the accent-source's own lightness (cursor or chosen ANSI
  // color) if it already clears 4.5:1 on bg; solve only if it doesn't.
  const accent = keepOrSolve(ac.l, acC, ac.h, bg, 4.5, 'darker');
  // accent-hover: still the designed -0.08 offset from accent, but that
  // offset is verified against 4.5:1 on bg and solve-adjusted if it breaks.
  const accentHover = keepOrSolve(accent[0] - 0.08, acC * 0.8, ac.h, bg, 4.5, 'darker');
  const codeBg = [r3(bg[0] - 0.03), bg[1], bg[2]];
  // Syntax-highlighting slots (issue #53) — see the derivation helpers
  // above. All verified against code-bg (not bg) at 4.5:1.
  const synKeyword = deriveSyntaxAnsi(t, 'blue', 'light', codeBg, 'darker');
  const synString = deriveSyntaxAnsi(t, 'green', 'light', codeBg, 'darker');
  const synConstant = deriveSyntaxAnsi(t, 'yellow', 'light', codeBg, 'darker');
  const synFunction = deriveSyntaxAnsi(t, 'purple', 'light', codeBg, 'darker');
  const synType = deriveSyntaxAnsi(t, 'cyan', 'light', codeBg, 'darker');
  const synComment = deriveSyntaxComment(t, 'light', codeBg, 'darker', fgC, fgH);
  const synPunctuation = deriveSyntaxPunctuation(fgC, fgH, codeBg, 'darker');
  const synVariable = deriveSyntaxVariable(fg, codeBg, 'darker', 0.08);
  const synLink = deriveSyntaxLink(accent, codeBg, 'darker');
  // Semantic state colors (issue #26) — see the derivation helpers above.
  // error/success/warning: keep-if-passing vs BOTH bg and surface at once;
  // disabled: aliased to the already-derived muted family, not ANSI.
  const stateError = deriveStateColor(t, 'red', 'light', bg, surface, 'darker');
  const stateSuccess = deriveStateColor(t, 'green', 'light', bg, surface, 'darker');
  const stateWarning = deriveStateColor(t, 'yellow', 'light', bg, surface, 'darker');
  const stateErrorSubtle = deriveStateSubtle(bg[0], stateError[2], 0.02, fg, 'darker');
  const stateSuccessSubtle = deriveStateSubtle(bg[0], stateSuccess[2], 0.02, fg, 'darker');
  const stateWarningSubtle = deriveStateSubtle(bg[0], stateWarning[2], 0.02, fg, 'darker');
  // Dataviz categorical slots (issue #94) — see deriveVizCategorical above.
  // Verified against --color-bg (not surface) at 3:1.
  const viz = deriveVizCategorical(t, 'light', lightSlug, bg, 'darker');
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
    'color-code-bg': codeBg,
    'color-code-fg': { ref: 'color-fg' },
    'color-syntax-keyword': synKeyword,
    'color-syntax-string': synString,
    'color-syntax-constant': synConstant,
    'color-syntax-comment': synComment,
    'color-syntax-function': synFunction,
    'color-syntax-type': synType,
    'color-syntax-punctuation': synPunctuation,
    'color-syntax-variable': synVariable,
    'color-syntax-link': synLink,
    'color-error': stateError,
    'color-error-subtle': stateErrorSubtle,
    'color-success': stateSuccess,
    'color-success-subtle': stateSuccessSubtle,
    'color-warning': stateWarning,
    'color-warning-subtle': stateWarningSubtle,
    'color-disabled': { ref: 'color-muted' },
    'color-viz-1': viz[0],
    'color-viz-2': viz[1],
    'color-viz-3': viz[2],
    'color-viz-4': viz[3],
    'color-viz-5': viz[4],
    'color-viz-6': viz[5],
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
  const [fgL0, fgC0, fgH] = slotLch(t, 'foreground', 'dark');
  const fgC = Math.min(fgC0, 0.02);
  // fg: keep the theme's own foreground lightness if it already clears the
  // AAA floor (7:1) against surface; solve only if it doesn't (mirrors
  // light — direction flipped, see #76).
  const fg = keepOrSolve(fgL0, fgC, fgH, surface, 7.0, 'lighter');
  const fgMuted = withHeadroom(solveL(fgC, fgH, bg, 7.0, 'lighter'), 0.01, 'lighter', fgC);
  const muted = solveL(fgC, fgH, surface, 4.5, 'lighter');
  const borderBold = withHeadroom(solveL(0.01, bgH, bg, 3.0, 'lighter'), 0.02, 'lighter', 0.01);
  const ac = accentHue(t, 'dark');
  const h = accentHueLight ?? ac.h; // keep hue consistent across the pair
  const acC = Math.min(ac.c, 0.12);
  // accent: keep the accent-source's own lightness if it already clears
  // 4.5:1 on bg; solve only if it doesn't.
  const accent = keepOrSolve(ac.l, acC, h, bg, 4.5, 'lighter');
  // accent-hover: still the designed +0.07 offset from accent, verified
  // against 4.5:1 on bg and solve-adjusted if the offset breaks it.
  const accentHover = keepOrSolve(accent[0] + 0.07, acC, h, bg, 4.5, 'lighter');
  const selBg = [r3(bg[0] + 0.14), fitChroma(r3(bg[0] + 0.14), 0.06, h), r1(h)];
  // selection-fg: "slightly brighter than fg on selection" — derived from
  // the (kept-or-solved) dark fg's own L/C/H, +0.02 lightness, verified
  // against 4.5:1 on selection-bg and solved only if that breaks it.
  const selFg = keepOrSolve(fg[0] + 0.02, fg[1], fg[2], selBg, 4.5, 'lighter');
  const codeBg = [r3(bg[0] + 0.04), bgC, bgH];
  // code-fg: "slightly dimmer than fg" — same pattern, -0.02, verified
  // against the AAA 7:1 line on code-bg.
  const codeFg = keepOrSolve(fg[0] - 0.02, fg[1], fg[2], codeBg, 7.0, 'lighter');
  // Syntax-highlighting slots (issue #53) — mirrors the light derivation,
  // direction flipped ('lighter': text on a dark code-bg).
  const synKeyword = deriveSyntaxAnsi(t, 'blue', 'dark', codeBg, 'lighter');
  const synString = deriveSyntaxAnsi(t, 'green', 'dark', codeBg, 'lighter');
  const synConstant = deriveSyntaxAnsi(t, 'yellow', 'dark', codeBg, 'lighter');
  const synFunction = deriveSyntaxAnsi(t, 'purple', 'dark', codeBg, 'lighter');
  const synType = deriveSyntaxAnsi(t, 'cyan', 'dark', codeBg, 'lighter');
  const synComment = deriveSyntaxComment(t, 'dark', codeBg, 'lighter', fgC, fgH);
  const synPunctuation = deriveSyntaxPunctuation(fgC, fgH, codeBg, 'lighter');
  const synVariable = deriveSyntaxVariable(fg, codeBg, 'lighter', -0.08);
  const synLink = deriveSyntaxLink(accent, codeBg, 'lighter');
  // Semantic state colors (issue #26) — mirrors the light derivation,
  // direction flipped ('lighter': text on a dark bg/surface).
  const stateError = deriveStateColor(t, 'red', 'dark', bg, surface, 'lighter');
  const stateSuccess = deriveStateColor(t, 'green', 'dark', bg, surface, 'lighter');
  const stateWarning = deriveStateColor(t, 'yellow', 'dark', bg, surface, 'lighter');
  const stateErrorSubtle = deriveStateSubtle(bg[0], stateError[2], 0.04, fg, 'lighter');
  const stateSuccessSubtle = deriveStateSubtle(bg[0], stateSuccess[2], 0.04, fg, 'lighter');
  const stateWarningSubtle = deriveStateSubtle(bg[0], stateWarning[2], 0.04, fg, 'lighter');
  // Dataviz categorical slots (issue #94) — mirrors the light derivation,
  // direction flipped ('lighter': marks on a dark bg).
  const viz = deriveVizCategorical(t, 'dark', darkSlug, bg, 'lighter');
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
    'color-syntax-keyword': synKeyword,
    'color-syntax-string': synString,
    'color-syntax-constant': synConstant,
    'color-syntax-comment': synComment,
    'color-syntax-function': synFunction,
    'color-syntax-type': synType,
    'color-syntax-punctuation': synPunctuation,
    'color-syntax-variable': synVariable,
    'color-syntax-link': synLink,
    'color-error': stateError,
    'color-error-subtle': stateErrorSubtle,
    'color-success': stateSuccess,
    'color-success-subtle': stateSuccessSubtle,
    'color-warning': stateWarning,
    'color-warning-subtle': stateWarningSubtle,
    'color-disabled': { ref: 'color-muted' },
    'color-viz-1': viz[0],
    'color-viz-2': viz[1],
    'color-viz-3': viz[2],
    'color-viz-4': viz[3],
    'color-viz-5': viz[4],
    'color-viz-6': viz[5],
  };
  const tokens = {};
  for (const [name, v] of Object.entries(raw)) tokens[name] = v.ref ? `var(--${v.ref})` : fmt(v);
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
  ['color-syntax-keyword', 'color-code-bg', 4.5, 'syntax: keyword'],
  ['color-syntax-string', 'color-code-bg', 4.5, 'syntax: string'],
  ['color-syntax-constant', 'color-code-bg', 4.5, 'syntax: constant'],
  ['color-syntax-comment', 'color-code-bg', 4.5, 'syntax: comment'],
  ['color-syntax-function', 'color-code-bg', 4.5, 'syntax: function'],
  ['color-syntax-type', 'color-code-bg', 4.5, 'syntax: type'],
  ['color-syntax-punctuation', 'color-code-bg', 4.5, 'syntax: punctuation'],
  ['color-syntax-variable', 'color-code-bg', 4.5, 'syntax: variable'],
  ['color-syntax-link', 'color-code-bg', 4.5, 'syntax: link'],
  ['color-error', 'color-bg', 4.5, 'state: error text'],
  ['color-error', 'color-surface', 4.5, 'state: error text on surface'],
  ['color-success', 'color-bg', 4.5, 'state: success text'],
  ['color-success', 'color-surface', 4.5, 'state: success text on surface'],
  ['color-warning', 'color-bg', 4.5, 'state: warning text'],
  ['color-warning', 'color-surface', 4.5, 'state: warning text on surface'],
  ['color-disabled', 'color-bg', 4.5, 'state: disabled text'],
  ['color-disabled', 'color-surface', 4.5, 'state: disabled text on surface'],
  ['color-fg', 'color-error-subtle', 4.5, 'state: fg on error-subtle banner bg'],
  ['color-fg', 'color-success-subtle', 4.5, 'state: fg on success-subtle banner bg'],
  ['color-fg', 'color-warning-subtle', 4.5, 'state: fg on warning-subtle banner bg'],
  ['color-viz-1', 'color-bg', 3.0, 'dataviz: categorical 1 (mark)'],
  ['color-viz-2', 'color-bg', 3.0, 'dataviz: categorical 2 (mark)'],
  ['color-viz-3', 'color-bg', 3.0, 'dataviz: categorical 3 (mark)'],
  ['color-viz-4', 'color-bg', 3.0, 'dataviz: categorical 4 (mark)'],
  ['color-viz-5', 'color-bg', 3.0, 'dataviz: categorical 5 (mark)'],
  ['color-viz-6', 'color-bg', 3.0, 'dataviz: categorical 6 (mark)'],
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

const regenCmd = `npx remarque-theme ${lightSlug} --dark ${darkSlug}${scopeName ? ` --scope ${scopeName}` : ''}`;
const lightSelector = scopeName ? `[data-palette="${scopeName}"]` : ':root';
const darkSelector = scopeName ? `[data-palette="${scopeName}"][data-theme="dark"]` : '[data-theme="dark"]';
const scopeNote = scopeName
  ? `\n *\n * Scoped for remarque-tokens/deck (--scope "${scopeName}") — this is one\n * palette among several coexisting in a stylesheet, switched at runtime\n * via [data-palette] rather than owning :root outright. Self-verification\n * below runs on the same derived [L,C,H] values regardless of scope; see\n * REMARQUE.md "Palette Deck" for the audit story on scoped output.`
  : '';

// --dataviz (issue #94, optional, judgment-call item 6): advisory
// --viz-sequential-N / --viz-diverging-N ramps straight from the
// dataset's dataviz block — gamut-clamped but NOT contrast-solved (a
// sequential ramp's low end is DESIGNED to sit near --color-bg; solving
// it to a contrast floor would defeat the ramp). Not audited, not
// golden-gated — see REMARQUE.md "Dataviz Tokens" for the recipe this
// flag implements and why these are ramps, not identity tokens.
function vizRamp(entries, prefix) {
  return entries.map((e, i) => {
    const [L0, C0, H0] = validateOklch(e.oklch, `${prefix}[${i}]`);
    const L = r3(Math.min(1, Math.max(0, L0)));
    return `  --${prefix}-${i + 1}: ${fmt([L, fitChroma(L, C0, H0), r1(H0)])};`;
  }).join('\n');
}
let vizBlock = '';
if (dataviz) {
  const { sequential: seqL, diverging: divL } = themeLight.dataviz || {};
  const { sequential: seqD, diverging: divD } = themeDark.dataviz || {};
  if (!seqL || !divL || !seqD || !divD) {
    die(`--dataviz requires dataviz.sequential/.diverging in the installed ${PKG_SPEC}@${themesVersion} — upgrade to >=0.5.0 (issue #94) and retry.`);
  }
  vizBlock = `
/* --dataviz ramps (issue #94) — advisory, NOT audited/golden-gated like
 * --color-viz-1..6 above. See REMARQUE.md "Dataviz Tokens". */
${lightSelector} {
${vizRamp(seqL, 'viz-sequential')}
${vizRamp(divL, 'viz-diverging')}
}

${darkSelector} {
${vizRamp(seqD, 'viz-sequential')}
${vizRamp(divD, 'viz-diverging')}
}
`;
}

const css = `/*
 * Generated by remarque-theme (remarque-tokens ${OWN_VERSION}) — DO NOT HAND-EDIT.
 * Regenerate instead: ${regenCmd}
 *
 * Source themes (${PKG_SPEC}@${themesVersion}):
 *   light = "${lightSlug}"   dark = "${darkSlug}"
 *   accent hue derived from: ${light.accentFrom} (H=${light.accentH.toFixed(1)})
 *
 * Palette tier only (--color-*, --weight-display) — see REMARQUE.md
 * "Token Tiers" / "Color Providers". Self-verified against the same
 * contrast + gamut checks as remarque-audit before being emitted.${scopeNote}
 */

${lightSelector} {
${decls(light.tokens)}
  --weight-display: 400;
}

${darkSelector} {
${decls(dark.tokens)}
}
${vizBlock}`;

if (outFile) {
  writeFileSync(outFile, css);
  console.error(`remarque-theme: wrote ${outFile}`);
} else {
  process.stdout.write(css);
}
