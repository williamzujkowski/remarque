import { test, expect } from '@playwright/test';
import { PAGES, VIEWPORTS, THEMES, gotoWithTheme } from './helpers';

/**
 * Screenshot regression (issue #49, item 1).
 *
 * Five page archetypes × light/dark × 375px/1280px = 20 baselines.
 * Baselines are committed and generated on Linux — the same OS family as
 * the `ubuntu-latest` CI runner — and CI is the canonical source: if a
 * local run on a different OS/font-set disagrees with CI, trust CI.
 *
 * `astro preview` (via playwright.config.ts's `webServer`) serves the
 * production build, so this exercises the same static output that ships
 * to GitHub Pages, base path included.
 */
for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} (${viewport.width}×${viewport.height})`, () => {
    for (const theme of THEMES) {
      test.describe(theme, () => {
        for (const pageSpec of PAGES) {
          test(pageSpec.slug, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await gotoWithTheme(page, pageSpec.path, theme);

            // Content is static (fixed ISO dates, no live/relative
            // timestamps) so no masking is needed — see AGENT_RULES.md
            // and the page sources for confirmation.
            await expect(page).toHaveScreenshot(
              `${pageSpec.slug}-${theme}-${viewport.name}.png`,
              { fullPage: true, animations: 'disabled' },
            );
          });
        }
      });
    }
  });
}
