/*
 * Shared helpers for scripts/build-registry.mjs and scripts/test-registry.mjs
 * (issue #100 — the machine-readable markup-contract registry).
 *
 * extractUsageHtml() is the single-sourcing mechanism for registry usage.html
 * content: REMARQUE.md's hand-authored "Markup contract" fenced ```html
 * blocks stay the ONE canonical copy of each known-good sample. A marker
 * comment (`<!-- registry-usage:<name> -->`) placed immediately before a
 * fence in REMARQUE.md tells this extractor which fenced block belongs to
 * which registry item — no second copy of the markup is ever hand-authored
 * for the registry, so the spec prose and the registry payload can't drift
 * apart the way two independently maintained copies could.
 *
 * sha256OfFiles() is the integrity-hash algorithm shared by the generator
 * (which computes it) and the test gate (which recomputes it independently
 * and asserts the two agree) — defined once so there is exactly one place
 * that could get the algorithm wrong, not two that could disagree.
 */

import { createHash } from 'node:crypto';

/**
 * Find every `<!-- registry-usage:<name> -->` marker in `markdown` and
 * return the content of the ```html fenced block that immediately follows
 * each one, concatenated in document order (blank-line separated). Throws
 * if the marker has no following ```html fence, the fence is unterminated,
 * or the marker doesn't appear at all — a silently-empty usage.html would
 * be a worse failure mode than a loud build error.
 */
export function extractUsageHtml(markdown, name) {
  // A word-boundary regex, not a fixed `<!-- registry-usage:NAME -->`
  // string — the marker comments carry trailing explanatory prose (see
  // REMARQUE.md), so only the `registry-usage:<name>` token itself, not
  // the whole comment, is load-bearing. The negative lookahead keeps
  // "essay" from matching inside a longer name that happened to start
  // with it (none do today; this is defense-in-depth, not a fix for an
  // observed collision).
  const markerRe = new RegExp(`registry-usage:${name}(?![a-z0-9-])`, 'g');
  const parts = [];
  let searchFrom = 0;
  while (true) {
    markerRe.lastIndex = searchFrom;
    const m = markerRe.exec(markdown);
    if (!m) break;
    const markerAt = m.index;
    const fenceOpen = markdown.indexOf('```html', markerAt);
    if (fenceOpen === -1) {
      throw new Error(`registry-usage marker "${name}" has no following \`\`\`html fence`);
    }
    const contentStart = markdown.indexOf('\n', fenceOpen) + 1;
    const fenceClose = markdown.indexOf('\n```', contentStart);
    if (fenceClose === -1) {
      throw new Error(`registry-usage marker "${name}": \`\`\`html fence is unterminated`);
    }
    parts.push(markdown.slice(contentStart, fenceClose));
    searchFrom = fenceClose;
  }
  if (parts.length === 0) {
    throw new Error(`no "registry-usage:${name}" marker found in REMARQUE.md`);
  }
  return parts.join('\n\n').trim() + '\n';
}

/**
 * Content-addressed integrity hash for a registry item's files, in the same
 * `sha256-<base64>` shape as the W3C Subresource Integrity attribute — a
 * deliberate borrow of an existing web security convention rather than a
 * bespoke format, since the property being asserted (this exact byte
 * content, and no other) is the same one SRI already names.
 *
 * Hashes the ordered file contents joined by a NUL separator (never a
 * legal byte inside either CSS or HTML text here) so two files whose
 * contents happen to concatenate identically under a different join
 * cannot collide.
 */
export function sha256OfFiles(files) {
  const hash = createHash('sha256');
  for (const file of files) hash.update(file.content, 'utf8').update('\0');
  return `sha256-${hash.digest('base64')}`;
}

/** Every `--custom-property` name referenced via `var(...)` in `css`, deduped and sorted. */
export function cssVarsOf(css) {
  const names = new Set();
  for (const m of css.matchAll(/var\((--[a-z0-9-]+)/g)) names.add(m[1]);
  return [...names].sort();
}
