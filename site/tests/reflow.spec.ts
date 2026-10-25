import { test, expect, type Page } from '@playwright/test';
import { PAGES, gotoWithTheme } from './helpers';

/**
 * WCAG 2.2 SC 1.4.10 Reflow and SC 1.4.12 Text Spacing (issue #122).
 * Geometry only, no pixel diffing.
 */

const overflowX = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// Strings no line-breaking opportunity can split: a URL, a package path,
// a hash, a heading word. Technical posts carry these constantly.
const LONG_URL = 'https://example.com/a/very/long/path/that/never/breaks/' + 'segment-'.repeat(12);
const LONG_CODE = '@scope/package-name-that-is-long/dist/esm/internal/' + 'x'.repeat(60);
const LONG_WORD = 'Pneumonoultramicroscopicsilicovolcanoconiosisinternationalization';

test.describe('reflow at 320 CSS px (WCAG 1.4.10)', () => {
  for (const p of PAGES) {
    test(`/${p.path} has no horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await gotoWithTheme(page, p.path, 'light');
      expect(await overflowX(page)).toBeLessThanOrEqual(0);
    });
  }

  test('unbreakable strings in prose wrap instead of widening the page', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await gotoWithTheme(page, 'writing/typography-as-interface', 'light');
    await page.evaluate(({ url, code, word }) => {
      const prose = document.querySelector('.remarque-prose')!;
      prose.insertAdjacentHTML('afterbegin', `
        <p>See <a href="${url}">${url}</a> for details.</p>
        <p>Install <code>${code}</code> first.</p>
        <h2>${word}</h2>
        <p><a href="#">${word}${word}</a></p>`);
    }, { url: LONG_URL, code: LONG_CODE, word: LONG_WORD });
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
  });

  test('broadsheet titles and forms messages wrap unbreakable strings', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await gotoWithTheme(page, 'writing', 'light');
    await page.evaluate((word) => {
      for (const sel of ['.remarque-masthead-title', '.remarque-lead-title', '.remarque-entry-title']) {
        const el = document.querySelector(sel);
        if (!el) throw new Error(`${sel} not found on /writing`);
        el.textContent = word;
      }
    }, LONG_WORD);
    expect(await overflowX(page)).toBeLessThanOrEqual(0);

    await gotoWithTheme(page, 'components', 'light');
    await page.evaluate((url) => {
      const msg = document.querySelector('.remarque-field-message');
      if (!msg) throw new Error('.remarque-field-message not found on /components');
      msg.textContent = `Use ${url}`;
      for (const sel of ['.remarque-button', '.remarque-checkbox', '.remarque-radio']) {
        const el = document.querySelector(sel);
        if (!el) throw new Error(`${sel} not found on /components`);
        el.append(` ${url}`);
      }
    }, LONG_URL);
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
  });

  test('a long TOC rail entry stays inside the rail at 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoWithTheme(page, 'writing/typography-as-interface', 'light');
    const g = await page.evaluate((word) => {
      const a = document.querySelector('.remarque-toc-rail a')!;
      a.textContent = word;
      const rail = document.querySelector('.remarque-toc-rail')!;
      return { scroll: rail.scrollWidth, client: rail.clientWidth };
    }, LONG_WORD);
    expect(g.scroll).toBeLessThanOrEqual(g.client);
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
  });
});

/* The SC 1.4.12 override set: what a user's text-spacing bookmarklet or
   stylesheet applies. Content must not be clipped or overlap. */
const TEXT_SPACING = `
  * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
  p { margin-bottom: 2em !important; }`;

test.describe('text spacing overrides (WCAG 1.4.12)', () => {
  const cases: { path: string; width: number; selectors: string[] }[] = [
    { path: 'components', width: 375, selectors: ['.remarque-button', '.remarque-field-label', '.remarque-input'] },
    { path: 'writing/typography-as-interface', width: 1280, selectors: ['.remarque-toc-rail summary', '.remarque-toc-rail a', '.remarque-sidenote'] },
    { path: 'writing/typography-as-interface', width: 375, selectors: ['.remarque-toc-rail summary', '.remarque-sidenote'] },
    { path: '', width: 375, selectors: ['.theme-toggle, [aria-label*="theme" i]', 'select'] },
  ];
  for (const c of cases) {
    test(`/${c.path} at ${c.width}px: no clipped text`, async ({ page }) => {
      await page.setViewportSize({ width: c.width, height: 900 });
      await gotoWithTheme(page, c.path, 'light');
      await page.addStyleTag({ content: TEXT_SPACING });
      const clipped = await page.evaluate((selectors) => {
        const out: string[] = [];
        for (const sel of selectors) {
          for (const el of document.querySelectorAll<HTMLElement>(sel)) {
            if (!el.getClientRects().length) continue; // not rendered at this width
            const s = getComputedStyle(el);
            // Text that spills a fixed box: it overflows (scroll > client)
            // and the box either clips it or is a control with a set height.
            const spillsX = el.scrollWidth > el.clientWidth + 1;
            const spillsY = el.scrollHeight > el.clientHeight + 1;
            const clips = s.overflowX !== 'visible' || s.overflowY !== 'visible';
            if ((spillsX || spillsY) && (clips || /^(BUTTON|INPUT|SELECT|SUMMARY|A)$/.test(el.tagName))) {
              out.push(`${sel} <${el.tagName.toLowerCase()}> ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight}`);
            }
          }
        }
        return out;
      }, c.selectors);
      expect(clipped).toEqual([]);
      expect(await overflowX(page)).toBeLessThanOrEqual(0);
    });
  }
});
