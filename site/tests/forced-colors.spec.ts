import { test, expect, type Locator } from '@playwright/test';
import { gotoWithTheme } from './helpers';

/**
 * Forced-colors + prefers-contrast gate (issue #93).
 *
 * The issue's CONDITION for "done" is explicit and BLOCKING: computed-style
 * assertions proving decorative/structural signals survive `forced-colors:
 * active`, wired into CI. Manual WHCM screenshots are evidence, not the
 * gate — so this file leads with computed-style checks (geometry/color-
 * keyword assertions only, no pixel diffing, same zero-flake shape as
 * computed-style.spec.ts) and adds forced-colors screenshots as a
 * secondary, non-blocking supplement at the bottom.
 *
 * `page.emulateMedia({ forcedColors: 'active' })` is deterministic in
 * headless Chromium — it renders Chromium's own built-in forced-colors
 * palette, not whatever the host OS's actual High Contrast theme happens
 * to be, so these assertions (and the screenshots below) are exactly as
 * reproducible as the rest of this suite.
 *
 * See REMARQUE.md "Forced Colors & Contrast Preferences" for the full
 * audit this gate is enforcing against regressing.
 */

test.describe('forced-colors: active — computed-style gate', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
  });

  test('nav link keyboard focus renders a visible, non-zero outline', async ({ page }) => {
    await gotoWithTheme(page, '', 'light');

    const navLink = page.locator('.nav-link').first();
    await navLink.focus();
    await expect(navLink).toBeFocused();

    const outline = await navLink.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) };
    });

    // `box-shadow` is unconditionally forced to `none` under forced-colors —
    // a focus ring built from it alone would disappear. `outline-style`/
    // `outline-width` are NOT on the forced list (only `outline-color` is
    // remapped to a system color), so tokens-core.css's outline-based
    // :focus-visible rule must still produce a real, visible ring here.
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThan(0);
  });

  test('.remarque-table borders resolve to a non-transparent border-color', async ({ page }) => {
    // .remarque-table (forms.css) and `.remarque-prose table` (prose.css)
    // share identical border declarations — border-bottom on th/td, same
    // --color-border-bold / --color-border tokens — so this exercises the
    // same structural rule either markup uses. `components` is the page
    // that actually renders a `.remarque-table` in this demo.
    await gotoWithTheme(page, 'components', 'light');

    const td = page.locator('.remarque-table td').first();
    await expect(td).toBeVisible();
    const color = await td.evaluate((el) => getComputedStyle(el).borderBottomColor);

    expect(color).not.toBe('transparent');
    expect(color).not.toMatch(/rgba?\(\s*0[,\s]+0[,\s]+0[,\s]+0\s*\)/);
  });

  test('essay module — TOC rail border-bottom stays visible', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoWithTheme(page, 'writing/typography-as-interface', 'light');

    // `.remarque-toc-rail summary`'s border-bottom is unconditional (not
    // gated on the >= 80rem breakpoint the rest of the module uses), so
    // this is representative at any viewport — 1280px matches the rest of
    // this file's essay-module viewport convention.
    const summary = page.locator('.remarque-toc-rail summary').first();
    const color = await summary.evaluate((el) => getComputedStyle(el).borderBottomColor);

    expect(color).not.toBe('transparent');
    expect(color).not.toMatch(/rgba?\(\s*0[,\s]+0[,\s]+0[,\s]+0\s*\)/);
  });

  test('essay module — narrow-viewport sidenote border stays visible', async ({ page }) => {
    // Narrow viewport: `.remarque-sidenote` is in its default (non-floated)
    // mode, where its `border-inline-start` is "the note's ONLY visual
    // separator from running prose" (essay.css's own comment) — the
    // functional case worth asserting, not the >= 80rem decorative-gutter
    // variant.
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoWithTheme(page, 'writing/typography-as-interface', 'light');

    const sidenote = page.locator('.remarque-sidenote').first();
    await expect(sidenote).toBeVisible();
    // Logical `border-inline-start` resolves to the physical `border-left`
    // longhand in this document's ltr/horizontal-tb writing mode — Chromium
    // exposes computed style only via the physical properties.
    const color = await sidenote.evaluate((el) => getComputedStyle(el).borderLeftColor);

    expect(color).not.toBe('transparent');
    expect(color).not.toMatch(/rgba?\(\s*0[,\s]+0[,\s]+0[,\s]+0\s*\)/);
  });

  test('form error state renders non-color (border-style) reinforcement', async ({ page }) => {
    await gotoWithTheme(page, 'components', 'light');

    // #email-error (error state) vs #message (plain, no data-state) — both
    // rendered by the same Input.astro / .remarque-input rule set, so the
    // ONLY authored difference between them is the data-state wiring.
    // Under forced-colors, border-COLOR is meaningless (both get forced to
    // the same system border color) — the forced-colors-only override in
    // forms.css differentiates them by border-style/-width instead, which
    // this asserts survives independently of color. The full (style,
    // width) shape is compared, not style alone: success/default share
    // `border-style: solid` by design (only width differs between them —
    // error and warning are the ones that also change style), so style-
    // only would miss that legitimate distinction.
    const borderShape = (loc: Locator) =>
      loc.evaluate((el) => {
        const cs = getComputedStyle(el);
        return `${cs.borderStyle} ${cs.borderWidth}`;
      });

    const [errorShape, defaultShape] = await Promise.all([
      borderShape(page.locator('#email-error')),
      borderShape(page.locator('#message')),
    ]);

    expect(errorShape).not.toBe(defaultShape);
  });

  test('form success state renders non-color (border-width) reinforcement, distinct from error', async ({ page }) => {
    await gotoWithTheme(page, 'components', 'light');

    const borderShape = (loc: Locator) =>
      loc.evaluate((el) => {
        const cs = getComputedStyle(el);
        return `${cs.borderStyle} ${cs.borderWidth}`;
      });

    const [errorShape, successShape, defaultShape] = await Promise.all([
      borderShape(page.locator('#email-error')),
      borderShape(page.locator('#email-success')),
      borderShape(page.locator('#message')),
    ]);

    expect(successShape).not.toBe(defaultShape);
    expect(successShape).not.toBe(errorShape);
  });
});

test.describe('forced-colors: active — screenshots (evidence, not the gate)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
  });

  const PAGES = [
    { slug: 'landing', path: '' },
    { slug: 'essay', path: 'writing/typography-as-interface' },
    { slug: 'components', path: 'components' },
  ];

  for (const pageSpec of PAGES) {
    test(`${pageSpec.slug} renders under forced-colors`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await gotoWithTheme(page, pageSpec.path, 'light');
      await expect(page).toHaveScreenshot(`forced-colors-${pageSpec.slug}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
});
