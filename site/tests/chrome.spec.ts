import { test, expect } from '@playwright/test';
import { gotoWithTheme } from './helpers';

/** Chrome module behavior (issue #127). Geometry and accessibility tree. */

test.describe('skip link (issue #127)', () => {
  test('hidden until focused; first Tab shows it at >= 44px; Enter moves focus to <main>', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoWithTheme(page, 'components', 'light');
    const link = page.locator('.remarque-skip-link');
    const rest = await link.boundingBox();
    expect(rest!.width).toBeLessThanOrEqual(1);

    await page.keyboard.press('Tab');
    await expect(link).toBeFocused();
    const shown = await link.boundingBox();
    expect(shown!.height).toBeGreaterThanOrEqual(44);
    expect(shown!.x).toBeGreaterThanOrEqual(0);
    expect(shown!.y).toBeGreaterThanOrEqual(0);
    // On top: the element at its center is the link itself.
    const onTop = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.classList.contains('remarque-skip-link'),
      { x: shown!.x + shown!.width / 2, y: shown!.y + shown!.height / 2 });
    expect(onTop).toBe(true);

    await page.keyboard.press('Enter');
    await expect(page.locator('main#main-content')).toBeFocused();
    expect(await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)).toBe('none');
  });
});

test.describe('breadcrumb, pager, tags (issue #127)', () => {
  test('breadcrumb separators stay out of the accessibility tree', async ({ page }) => {
    await gotoWithTheme(page, 'projects/remarque', 'light');
    // Drop the snapshot's own `/url:` lines; what's left is the text.
    const snap = (await page.locator('nav.remarque-breadcrumb').ariaSnapshot()).split('\n').filter((l) => !l.includes('/url:')).join('\n');
    expect(snap).toContain('Home');
    expect(snap).not.toContain('/');
    const current = page.locator('.remarque-breadcrumb [aria-current="page"]');
    await expect(current).toHaveText('Remarque');
    expect(await current.evaluate((el) => el.tagName)).toBe('SPAN');
  });

  test('pager: prev sits at inline-start, next at inline-end, even when alone', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoWithTheme(page, 'writing/against-decoration', 'light');
    const g = await page.evaluate(() => {
      const nav = document.querySelector('.remarque-pager')!.getBoundingClientRect();
      const next = document.querySelector('.remarque-pager-next')!.getBoundingClientRect();
      return { navR: nav.right, nextR: next.right, nextL: next.left, mid: (nav.left + nav.right) / 2 };
    });
    expect(Math.abs(g.navR - g.nextR)).toBeLessThanOrEqual(1);
    expect(g.nextL).toBeGreaterThanOrEqual(g.mid - 1);
    await expect(page.locator('a.remarque-pager-next')).toHaveAttribute('rel', 'next');
    expect(await page.locator('.remarque-pager-prev').count()).toBe(0); // the endpoint is omitted
  });

  test('pager arrows are decoration: not in the accessibility tree', async ({ page }) => {
    await gotoWithTheme(page, 'components', 'light');
    const snap = await page.locator('nav.remarque-pager').ariaSnapshot();
    expect(snap).not.toMatch(/[←→]/);
  });

  test('tags are plain mono links: no border, fill or radius', async ({ page }) => {
    await gotoWithTheme(page, 'components', 'light');
    const s = await page.locator('.remarque-tags a').first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return { border: cs.borderTopWidth, bg: cs.backgroundColor, radius: cs.borderTopLeftRadius, font: cs.fontFamily };
    });
    expect(s.border).toBe('0px');
    expect(s.bg).toBe('rgba(0, 0, 0, 0)');
    expect(s.radius).toBe('0px');
    expect(s.font).toContain('JetBrains Mono');
  });

  test('pagination: the current page is text, and every link is >= 44px', async ({ page }) => {
    await gotoWithTheme(page, 'components', 'light');
    const current = page.locator('.remarque-pagination [aria-current="page"]');
    expect(await current.evaluate((el) => el.tagName)).toBe('SPAN');
    for (const box of await page.locator('.remarque-pagination a').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  });
});
