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

/* Standard tier filters */
export const isLightRoot = (b) => b.context === '' && b.prelude.includes(':root');
export const isDarkBlock = (b) =>
  (b.context.includes('prefers-color-scheme') && b.context.includes('dark') && b.prelude.includes(':root')) ||
  b.prelude.includes('[data-theme="dark"]');
