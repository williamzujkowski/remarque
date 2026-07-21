import { test, expect } from '@playwright/test';
import { PAGES, VIEWPORTS, gotoWithTheme } from './helpers';

/**
 * Computed-style assertions (issue #49, item 2) — AGENT_RULES.md checklist
 * lines turned into executable tests. These are geometry/network/DOM
 * checks only, no pixel diffing, so they carry none of the screenshot
 * suite's flake risk and should always run.
 */

test.describe('body typography floor', () => {
  test('font-size >= 17px and line-height >= 1.75x', async ({ page }) => {
    await gotoWithTheme(page, PAGES[0].path, 'light');

    const { fontSizePx, lineHeightPx } = await page.evaluate(() => {
      const cs = getComputedStyle(document.body);
      return {
        fontSizePx: parseFloat(cs.fontSize),
        lineHeightPx: parseFloat(cs.lineHeight),
      };
    });

    expect(fontSizePx).toBeGreaterThanOrEqual(16.99);
    // AGENT_RULES.md's line-height floor is a ratio (1.75), not a raw px
    // value — em-relative and percentage line-heights would otherwise
    // escape a static regex scan (see issue #49 comment on the #61
    // follow-up), so this divides back out to the ratio.
    const ratio = lineHeightPx / fontSizePx;
    expect(ratio).toBeGreaterThanOrEqual(1.749);
  });
});

test.describe('prose measure', () => {
  test('reading column max-width <= 46rem', async ({ page }) => {
    await gotoWithTheme(page, 'writing/typography-as-interface', 'light');

    const { maxWidthPx, rootFontSizePx } = await page.evaluate(() => {
      const el = document.querySelector('.remarque-prose.content-reading');
      if (!el) throw new Error('.remarque-prose.content-reading not found on the Essay page');
      return {
        maxWidthPx: parseFloat(getComputedStyle(el).maxWidth),
        rootFontSizePx: parseFloat(getComputedStyle(document.documentElement).fontSize),
      };
    });

    expect(maxWidthPx).toBeLessThanOrEqual(46 * rootFontSizePx + 0.5);
  });
});

test.describe('interactive target size (>= 44x44 CSS px)', () => {
  for (const viewport of VIEWPORTS) {
    test(`theme toggle, nav links, footer links — ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await gotoWithTheme(page, PAGES[0].path, 'light');

      const targets = await page.evaluate(() => {
        function box(el: Element) {
          const r = el.getBoundingClientRect();
          return { width: r.width, height: r.height };
        }
        const out: { label: string; width: number; height: number }[] = [];
        const toggle = document.querySelector('#theme-toggle');
        if (toggle) out.push({ label: 'theme-toggle', ...box(toggle) });
        document.querySelectorAll('.nav-link').forEach((el) => {
          out.push({ label: `nav-link:${el.textContent?.trim()}`, ...box(el) });
        });
        document.querySelectorAll('.footer-link').forEach((el) => {
          out.push({ label: `footer-link:${el.textContent?.trim()}`, ...box(el) });
        });
        return out;
      });

      expect(targets.length).toBeGreaterThan(0);
      for (const t of targets) {
        expect(t.width, `${t.label} width`).toBeGreaterThanOrEqual(44);
        expect(t.height, `${t.label} height`).toBeGreaterThanOrEqual(44);
      }
    });
  }
});

test.describe('font hosting', () => {
  test('no request ever hits fonts.googleapis.com', async ({ page }) => {
    const offendingRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('fonts.googleapis.com') || req.url().includes('fonts.gstatic.com')) {
        offendingRequests.push(req.url());
      }
    });

    for (const pageSpec of PAGES) {
      await page.goto(pageSpec.path);
      await page.evaluate(() => document.fonts.ready);
    }

    expect(offendingRequests).toEqual([]);
  });
});

test.describe('theme FOUC guard', () => {
  test('data-theme is set on <html> before first paint, on a fresh page', async ({ page }) => {
    // A genuinely fresh context/page: no localStorage pre-seeding, so this
    // exercises the real matchMedia fallback path, not a value we planted.
    const response = await page.request.get(PAGES[0].path);
    expect(response.ok()).toBeTruthy();
    const rawHtml = await response.text();

    // Static check: the FOUC guard must be a synchronous, render-blocking
    // inline script physically located in <head> — async/defer/module
    // scripts do not run before first paint, so their presence there
    // would defeat the guard even though the attribute eventually appears.
    const headHtml = rawHtml.slice(0, rawHtml.indexOf('</head>'));
    expect(headHtml).toContain('data-theme');
    expect(headHtml).toMatch(/<script>\s*\(function\s*\(\)\s*\{[\s\S]*?data-theme/);
    expect(headHtml).not.toMatch(/<script[^>]+(async|defer|type=["']module["'])[^>]*>[\s\S]*?data-theme/);

    // Runtime check: after a real navigation, the attribute actually holds
    // a resolved theme value (proves the script runs, not just that it's
    // textually present).
    await page.goto(PAGES[0].path);
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(['light', 'dark']).toContain(theme);
  });
});

test.describe('dark-mode display weight', () => {
  test('--weight-display resolves to 500 on a .text-title element', async ({ page }) => {
    await gotoWithTheme(page, 'specimen', 'dark');

    const fontWeight = await page.evaluate(() => {
      const el = document.querySelector('.text-title');
      if (!el) throw new Error('.text-title not found on the specimen page');
      return getComputedStyle(el).fontWeight;
    });

    expect(fontWeight).toBe('500');
  });
});
