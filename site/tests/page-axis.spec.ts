import { test, expect } from '@playwright/test';
import { gotoWithTheme } from './helpers';

/**
 * Page-axis and masthead gates (issues #119, #121). Geometry only, no
 * pixel diffing.
 */

test.describe('essay grid keeps the reading column on the page axis (issue #119)', () => {
  for (const width of [1280, 1440, 1920]) {
    test(`essay prose is centered at ${width}px, like every other .content-reading page`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await gotoWithTheme(page, 'writing/typography-as-interface', 'light');
      const essay = await page.evaluate(() => {
        const prose = document.querySelector('.remarque-prose.content-reading');
        if (!prose) throw new Error('.remarque-prose.content-reading not found on the Essay page');
        const r = prose.getBoundingClientRect();
        return { center: (r.left + r.right) / 2 };
      });
      // Compared with a plain page, not innerWidth / 2: html's
      // scrollbar-gutter: stable (#121) moves every page's axis by half
      // the gutter on classic-scrollbar platforms, the same on all pages.

      await gotoWithTheme(page, 'notes', 'light');
      const plain = await page.evaluate(() => {
        const el = document.querySelector('.content-reading');
        if (!el) throw new Error('.content-reading not found on /notes');
        const r = el.getBoundingClientRect();
        return (r.left + r.right) / 2;
      });
      expect(Math.abs(essay.center - plain)).toBeLessThanOrEqual(1);
    });
  }

  test('sidenotes and the rail stay clear of the prose at 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoWithTheme(page, 'writing/typography-as-interface', 'light');
    const g = await page.evaluate(() => {
      const prose = document.querySelector('.remarque-prose.content-reading')!.getBoundingClientRect();
      const notes = [...document.querySelectorAll('.remarque-sidenote')].map((n) => n.getBoundingClientRect());
      const rail = document.querySelector('.remarque-toc-rail')!.getBoundingClientRect();
      return { proseLeft: prose.left, proseRight: prose.right, notes: notes.map((n) => ({ l: n.left, r: n.right })), railLeft: rail.left, railRight: rail.right, vw: document.documentElement.clientWidth };
    });
    expect(g.notes.length).toBeGreaterThan(0);
    for (const n of g.notes) {
      expect(n.l).toBeGreaterThanOrEqual(0);
      expect(n.r).toBeLessThanOrEqual(g.proseLeft);
    }
    expect(g.railLeft).toBeGreaterThan(g.proseRight);
    expect(g.railRight).toBeLessThanOrEqual(g.vw);
  });
});

test.describe('broadsheet masthead title is sized from its own box (issue #121)', () => {
  const FOUR_WORDS = 'Notes Toward a Quieter Typography';

  for (const width of [768, 1280, 1920]) {
    test(`a four-word title wraps to at most 2 lines at ${width}px, and outranks the lead title`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await gotoWithTheme(page, 'writing', 'light');
      const m = await page.evaluate((text) => {
        const t = document.querySelector('.remarque-masthead-title');
        const lead = document.querySelector('.remarque-lead-title');
        if (!t || !lead) throw new Error('masthead or lead title not found on /writing');
        t.textContent = text;
        const range = document.createRange();
        range.selectNodeContents(t);
        const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
        return { lines, title: parseFloat(getComputedStyle(t).fontSize), lead: parseFloat(getComputedStyle(lead).fontSize) };
      }, FOUR_WORDS);
      expect(m.lines).toBeLessThanOrEqual(2);
      // REMARQUE.md: the masthead is the one register allowed to outgrow
      // --text-display, which the lead title uses.
      expect(m.title).toBeGreaterThan(m.lead);
    });
  }
});
