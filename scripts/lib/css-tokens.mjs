/*
 * Shared CSS token extraction for scripts/audit.mjs and
 * scripts/tokens-json.mjs (previously duplicated in both).
 */

/* Brace-aware CSS block extraction. Returns [{ prelude, body, context }]
   where context is the enclosing at-rule prelude ('' at top level).
   One level of at-rule nesting is supported — enough for token files;
   deeper nesting is flattened with its outermost context. Comments are
   stripped first. */
export function extractBlocks(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [];
  function scan(text, context) {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf('{', i);
      if (open === -1) break;
      // Body-less at-statements (@import 'x'; @charset ...;) preceding a block
      // would otherwise pollute its prelude and misclassify it as an at-rule
      // (#67): keep only the segment after the last ';'.
      const prelude = text.slice(i, open).split(';').pop().trim();
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

export function declsOf(blocks, filterFn) {
  const decls = {};
  for (const b of blocks) {
    if (!filterFn(b)) continue;
    for (const m of b.body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      decls[m[1]] = m[2].trim();
    }
  }
  return decls;
}

/* Standard tier filters. Selector matching is exact per comma-separated
   part — `.includes(':root')` would wrongly classify `:root.dark` (a
   dark block in the class convention) as light. */
const parts = (prelude) => prelude.split(',').map((s) => s.trim());

const DARKISH = /(\.dark\b|\[data-theme="dark"\])/;
const ROOTISH = /^(:root|html|body)\b/;
// A bare palette-deck scope selector (remarque-tokens/deck, issue #56) — no
// [data-theme] of its own, so it plays the same "light root" role for that
// scope that :root plays sitewide. Exact-match, same shape as the existing
// `[data-theme="light"]` special case immediately below — not a general
// attribute-selector grammar, just one more enumerated light-ish selector.
const PALETTE_SCOPE_LIGHT = /^\[data-palette="[a-z0-9-]+"\]$/;
export const isLightRoot = (b) =>
  b.context === '' && parts(b.prelude).some((s) =>
    (ROOTISH.test(s) && !DARKISH.test(s)) || s === '[data-theme="light"]' || PALETTE_SCOPE_LIGHT.test(s));

/* Dark: media-query :root, the canonical [data-theme="dark"], or the
   class-convention :root.dark / html.dark (compatibility bridge). A scoped
   deck palette's dark block ([data-palette="name"][data-theme="dark"])
   already matches unchanged: DARKISH finds the [data-theme="dark"]
   substring, and the selector starts with "[".
   Both recognition paths are CONTEXT-EXACT (issue #93 fix): a block only
   counts as "the" dark override when its enclosing at-rule is either
   absent (top-level) or is the plain, non-compounded `@media
   (prefers-color-scheme: dark)` query — not some unrelated or compounded
   at-rule (`@media print`, `@media (prefers-contrast: more)`, `@media
   (prefers-contrast: more) and (prefers-color-scheme: dark)`, ...) that
   merely happens to reuse the same selector text or mention the same
   media-feature name. Before this guard, substring matching on `context`
   (`.includes('prefers-color-scheme')`) and on `prelude` (DARKISH, with
   no context check at all) meant ANY nested reuse of `[data-theme=
   "dark"]`/`:root.dark`, or any compound query merely containing
   `prefers-color-scheme: dark` as one of several conditions, was
   misread as an unconditional dark value — silently clobbering the real
   one (`declsOf` last-write-wins). tokens-palette.css's `@media
   (prefers-contrast: more)` block is the case that surfaced this: it
   deliberately reuses the `[data-theme="dark"], :root.dark` selector,
   scoped to a NARROWER condition, and must NOT be read as redefining
   dark mode itself. */
const isPlainDarkSchemeMedia = (context) =>
  /^@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)$/.test(context.trim());

export const isDarkBlock = (b) =>
  (isPlainDarkSchemeMedia(b.context) &&
    parts(b.prelude).some((s) => ROOTISH.test(s) && !DARKISH.test(s))) ||
  (b.context === '' &&
    parts(b.prelude).some((s) => DARKISH.test(s) && (ROOTISH.test(s) || s.startsWith('.') || s.startsWith('['))));

/* ── light-dark() support (issue #95) ──────────────────────────────────
 * The migration collapses a token's light AND dark values into ONE
 * declaration — `--color-x: light-dark(<light>, <dark>);` — living in the
 * top-level `:root` block (isLightRoot territory), rather than two
 * declarations split across the :root/dark-block convention above. The
 * conventional two-block form is NOT going away (mixed-form palettes are
 * supported — a consumer may migrate some tokens and leave others in the
 * old convention, and the bridge's own generated output keeps emitting
 * the old convention indefinitely; see REMARQUE.md "Color Scheme &
 * light-dark()"), so both forms must parse side by side.
 *
 * splitLightDark() does the actual splitting: depth-aware (so a light or
 * dark side that is itself a function call — `oklch(...)`, `var(...)` —
 * doesn't confuse the single top-level comma this looks for). Returns
 * null for any value that isn't a light-dark() call, so callers can
 * treat it as a plain passthrough. */
export function splitLightDark(value) {
  const v = value.trim();
  const m = v.match(/^light-dark\(\s*/i);
  if (!m || !v.endsWith(')')) return null;
  const inner = v.slice(m[0].length, -1);
  let depth = 0, splitAt = -1;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) { splitAt = i; break; }
  }
  if (splitAt === -1) return null;
  return { light: inner.slice(0, splitAt).trim(), dark: inner.slice(splitAt + 1).trim() };
}

/* Resolve a flat decls map (as returned by declsOf) to one theme "side".
 * A `light-dark(a, b)` value collapses to `a` (side 'light') or `b` (side
 * 'dark'); every other value — a plain oklch() literal, a var() alias, a
 * non-color token like --weight-display — passes through UNCHANGED. That
 * makes this a no-op over a palette that hasn't adopted light-dark() at
 * all, which is exactly the backward-compat property the parser needs:
 * every existing conventional-form fixture keeps resolving identically. */
export function resolveSide(decls, side) {
  const out = {};
  for (const [name, value] of Object.entries(decls)) {
    const ld = splitLightDark(value);
    out[name] = ld ? ld[side] : value;
  }
  return out;
}

/* Compute the merged "dark override" map the four parser consumers each
 * need, from the two raw declsOf() extractions:
 *   - rawLightRootDecls: declsOf(blocks, isLightRoot) — the top-level
 *     :root block, where a light-dark() declaration's DARK side now
 *     lives (alongside its light side).
 *   - rawDarkBlockDecls: declsOf(blocks, isDarkBlock) — the conventional
 *     dark-block override (@media prefers-color-scheme:dark and/or
 *     [data-theme="dark"]/:root.dark), still used for non-color tokens
 *     (--weight-display) and any token a palette hasn't migrated yet.
 *
 * Precedence matches real CSS cascade: when the SAME token is declared
 * both ways (a light-dark() value in :root AND an explicit override in a
 * later dark block), the dark block — which appears later in the
 * stylesheet at equal specificity — wins, so it is spread last here. */
export function darkOverridesOf(rawLightRootDecls, rawDarkBlockDecls) {
  const fromLightDark = {};
  for (const [name, value] of Object.entries(rawLightRootDecls)) {
    const ld = splitLightDark(value);
    if (ld) fromLightDark[name] = ld.dark;
  }
  return { ...fromLightDark, ...resolveSide(rawDarkBlockDecls, 'dark') };
}
