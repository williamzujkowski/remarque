/*
 * Remarque's Shiki theme — wires --color-syntax-* (remarque-tokens, see
 * REMARQUE.md "Syntax Highlighting") into Shiki's css-variables mode.
 *
 * IMPORTANT: pass this OBJECT to `theme`/`shikiConfig.theme` — never the
 * `'css-variables'` string form. Astro's own Shiki integration renames
 * the string form's variable prefix to `--astro-code-*`, which silently
 * breaks the mapping to Remarque's tokens.
 *
 * Imported from 'shiki' rather than '@shikijs/core' directly: Astro (and
 * @astrojs/mdx) already carry shiki as a dependency, so this resolves
 * without adding a parallel copy — pinned explicitly in package.json
 * devDependencies at the same range Astro itself uses, so the
 * resolution is intentional rather than an accident of hoisting.
 */
import { createCssVariablesTheme } from 'shiki';

export const remarqueShikiTheme = createCssVariablesTheme({
  name: 'remarque',
  variablePrefix: '--color-syntax-',
  fontStyle: true,
});
