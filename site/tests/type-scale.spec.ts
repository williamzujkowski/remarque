import { test, expect } from '@playwright/test';
import { gotoWithTheme } from './helpers';

/** Heading ladder and lede (issue #131). Sizes are unchanged; voices differ. */

test.describe('heading ladder (issue #131)', () => {
  test('h4 differs from h3 in face, keeps 17px, and stays distinct from h5', async ({ page }) => {
    await gotoWithTheme(page, 'writing/typography-as-interface', 'light');
    const s = await page.evaluate(() => {
      document.querySelector('.remarque-prose')!.insertAdjacentHTML('afterbegin', '<h3 id="t3">Three</h3><h4 id="t4">Four</h4><h5 id="t5">Five</h5>');
      const cs = (id: string) => { const c = getComputedStyle(document.getElementById(id)!); return { family: c.fontFamily, weight: c.fontWeight, style: c.fontStyle, size: c.fontSize }; };
      return { h3: cs('t3'), h4: cs('t4'), h5: cs('t5') };
    });
    expect(s.h4.family).not.toBe(s.h3.family);
    expect(s.h4.family).toContain('Newsreader');
    expect(s.h4.size).toBe('17px');
    expect(s.h4.weight).toBe('500');
    expect(s.h4.style).toBe('normal');
    expect(s.h5.style).toBe('italic');
  });

  test('where h5 sets upright (Arabic), it steps down in color so it still differs from h4', async ({ page }) => {
    await gotoWithTheme(page, 'writing/typography-as-interface', 'light');
    const s = await page.evaluate(() => {
      document.documentElement.setAttribute('lang', 'ar');
      document.documentElement.setAttribute('dir', 'rtl');
      document.querySelector('.remarque-prose')!.insertAdjacentHTML('afterbegin', '<h4 id="t4">أربعة</h4><h5 id="t5">خمسة</h5>');
      const a = getComputedStyle(document.getElementById('t4')!), b = getComputedStyle(document.getElementById('t5')!);
      return { same: a.fontFamily === b.fontFamily && a.fontStyle === b.fontStyle && a.fontWeight === b.fontWeight, c4: a.color, c5: b.color };
    });
    expect(s.same).toBe(true);
    expect(s.c5).not.toBe(s.c4);
  });

  test('the demo lede is in full foreground, not fg-muted', async ({ page }) => {
    await gotoWithTheme(page, 'writing/against-decoration', 'light');
    const s = await page.evaluate(() => {
      const ps = [...document.querySelectorAll('.remarque-prose p')].map((p) => getComputedStyle(p));
      const lede = ps.find((c) => c.fontSize === '19px');
      const body = ps.find((c) => c.fontSize === '17px');
      return { lede: lede?.color, body: body?.color };
    });
    expect(s.lede).toBe(s.body);
  });

  test('byline tags are separate list items, not one run-together phrase', async ({ page }) => {
    await gotoWithTheme(page, 'writing/typography-as-interface', 'light');
    const tags = page.locator('ul.remarque-tags[aria-label="Tags"] li');
    expect(await tags.count()).toBeGreaterThan(1);
  });
});
