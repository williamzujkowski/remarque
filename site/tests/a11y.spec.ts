import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PAGES, THEMES, gotoWithTheme } from './helpers';

/**
 * axe-core gate (issue #126): WCAG 2.0/2.1/2.2 A + AA rules, every demo page
 * in both themes, plus a forced-colors pass. Fails on serious/critical
 * violations. axe covers only the machine-checkable subset of WCAG; it
 * complements computed-style.spec.ts and forced-colors.spec.ts, not
 * replaces them. Only exclusion: color-contrast in the forced-colors pass (see scan()).
 *
 * The 'wcag22aa' tag was confirmed present in the pinned axe-core's rule
 * metadata (target-size is tagged wcag22aa + wcag258).
 */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function scan(page: Page, opts: { forcedColors?: boolean } = {}) {
  const builder = new AxeBuilder({ page }).withTags(TAGS);
  // Justified exclusion, forced-colors pass only: under forced-colors the UA
  // replaces every author color with system colors at paint time, but axe's
  // color-contrast reads Chromium's emulated state inconsistently (it pairs
  // the authored dark-theme foreground, e.g. #e0deda, with the white system
  // Canvas and reports 1.34:1 on every text node in the dark theme, while
  // the light theme passes). Contrast is not author-controlled in this mode,
  // and the authored palette is gated by `npm run audit` plus the normal
  // (non-forced) passes above. Every other rule still runs.
  if (opts.forcedColors) builder.disableRules(['color-contrast']);
  const results = await builder.analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map(
        (n) => `${n.target.join(' ')} :: ${n.failureSummary?.split('\n').slice(0, 3).join(' | ')}`,
      ),
    }));
}

for (const { slug, path } of PAGES) {
  for (const theme of THEMES) {
    test(`axe: ${slug} (${theme})`, async ({ page }) => {
      await gotoWithTheme(page, path, theme);
      expect(await scan(page)).toEqual([]);
    });

    test(`axe: ${slug} (${theme}, forced-colors)`, async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await gotoWithTheme(page, path, theme);
      expect(await scan(page, { forcedColors: true })).toEqual([]);
    });
  }
}
