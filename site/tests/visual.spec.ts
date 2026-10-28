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

/**
 * The essay drop cap (0.33). Only /writing/against-decoration/ opts into
 * `.remarque-prose--dropcap`, and the full-page shots above do not carry
 * it, so its fit has its own baselines: the opening paragraph, cropped,
 * light/dark × 375/1280. The numeric fit (ink top on the first line's
 * cap-height, foot on line 3's baseline, per engine and face) is
 * asserted in dropcap-fit.spec.ts; these catch the look.
 */
for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test(`dropcap-essay ${theme} ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await gotoWithTheme(page, 'writing/against-decoration', theme);
      const box = await page.locator('.remarque-prose--dropcap > p:first-of-type').first().boundingBox();
      expect(box).not.toBeNull();
      const clip = { x: Math.max(0, box!.x - 16), y: Math.max(0, box!.y - 16), width: Math.min(viewport.width, box!.width + 32), height: box!.height + 32 };
      await expect(page).toHaveScreenshot(`dropcap-essay-${theme}-${viewport.name}.png`, { clip, fullPage: true, animations: 'disabled' });
    });
  }
}
