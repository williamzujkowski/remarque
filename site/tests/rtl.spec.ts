import { test, expect, type Page } from '@playwright/test';
import { gotoWithTheme } from './helpers';

/**
 * RTL and script-aware gates (issue #123). The demo is English, so each
 * test flips <html> to dir="rtl" lang="ar" (or a CJK lang) after load:
 * the shipped CSS is what's under test, not the demo's copy.
 */

async function asRtl(page: Page, path: string, width: number, lang = 'ar') {
  await page.setViewportSize({ width, height: 900 });
  await gotoWithTheme(page, path, 'light');
  await page.evaluate((l) => {
    document.documentElement.setAttribute('dir', l === 'ar' || l === 'he' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', l);
  }, lang);
}

test.describe('RTL essay layout (issue #123)', () => {
  test('wide sidenotes land in the inline-start gutter, clear of the prose', async ({ page }) => {
    await asRtl(page, 'writing/typography-as-interface', 1440);
    const g = await page.evaluate(() => {
      const prose = document.querySelector('.remarque-prose.content-reading')!.getBoundingClientRect();
      const notes = [...document.querySelectorAll('.remarque-sidenote')].map((n) => n.getBoundingClientRect());
      const rail = document.querySelector('.remarque-toc-rail')!.getBoundingClientRect();
      return { pl: prose.left, pr: prose.right, notes: notes.map((n) => [n.left, n.right]), rl: rail.left, rr: rail.right, vw: document.documentElement.clientWidth };
    });
    expect(g.notes.length).toBeGreaterThan(0);
    for (const [l, r] of g.notes) {
      // inline-start is the right-hand side in RTL
      expect(l).toBeGreaterThanOrEqual(g.pr);
      expect(r).toBeLessThanOrEqual(g.vw);
    }
    // ...and the rail mirrors to the left
    expect(g.rr).toBeLessThan(g.pl);
    expect(g.rl).toBeGreaterThanOrEqual(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test('prose rules mirror: blockquote bar, list indent, table alignment', async ({ page }) => {
    await asRtl(page, 'writing/typography-as-interface', 1280);
    const s = await page.evaluate(() => {
      const prose = document.querySelector('.remarque-prose')!;
      prose.insertAdjacentHTML('afterbegin', `
        <blockquote id="t-bq"><p>اقتباس</p></blockquote>
        <ul id="t-ul"><li>بند</li></ul>
        <dl><dt>مصطلح</dt><dd id="t-dd">تعريف</dd></dl>
        <table><thead><tr><th id="t-th">عمود</th><th class="num">رقم</th></tr></thead>
        <tbody><tr><td>أ</td><td class="num" id="t-num">42</td></tr></tbody></table>`);
      const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
      const bq = cs('t-bq'), ul = cs('t-ul'), dd = cs('t-dd');
      return {
        bqRight: bq.borderRightWidth, bqLeft: bq.borderLeftWidth,
        ulPadRight: ul.paddingRight, ulPadLeft: ul.paddingLeft,
        ddMarginRight: dd.marginRight,
        th: cs('t-th').textAlign, num: cs('t-num').textAlign,
      };
    });
    expect(s.bqRight).toBe('2px');
    expect(s.bqLeft).toBe('0px');
    expect(parseFloat(s.ulPadRight)).toBeGreaterThan(0);
    expect(s.ulPadLeft).toBe('0px');
    expect(s.ddMarginRight).toBe('0px');
    expect(s.th).toBe('start');
    expect(s.num).toBe('end');
  });
});

test.describe('script-aware guards (issue #123)', () => {
  test('Arabic: no tracking on headings or labels, no faked italics', async ({ page }) => {
    await asRtl(page, 'writing/typography-as-interface', 1280);
    const s = await page.evaluate(() => {
      const prose = document.querySelector('.remarque-prose')!;
      prose.insertAdjacentHTML('afterbegin', '<blockquote id="t-bq"><p>اقتباس</p></blockquote><p><em id="t-em">تأكيد</em></p>');
      const h1 = document.querySelector('h1')!;
      return {
        h1: getComputedStyle(h1).letterSpacing,
        bq: getComputedStyle(document.getElementById('t-bq')!).fontStyle,
        em: getComputedStyle(document.getElementById('t-em')!).fontStyle,
      };
    });
    expect(['0px', 'normal']).toContain(s.h1);
    expect(s.bq).toBe('normal');
    expect(s.em).toBe('normal');
  });

  test('Japanese: display headings get CJK leading and no tracking', async ({ page }) => {
    await asRtl(page, 'writing/typography-as-interface', 1280, 'ja');
    const s = await page.evaluate(() => {
      const h1 = document.querySelector('h1')!;
      const cs = getComputedStyle(h1);
      return { ls: cs.letterSpacing, lh: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) };
    });
    expect(['0px', 'normal']).toContain(s.ls);
    expect(s.lh).toBeGreaterThanOrEqual(1.3);
  });

  test('English is untouched: display tracking stays negative', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoWithTheme(page, 'writing/typography-as-interface', 'light');
    const ls = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('h1')!).letterSpacing));
    expect(ls).toBeLessThan(0);
  });
});
