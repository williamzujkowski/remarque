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
