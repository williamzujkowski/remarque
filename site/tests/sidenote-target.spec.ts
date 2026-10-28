import { test, expect } from '@playwright/test';

/**
 * Sidenote marker tap target (0.33; WCAG 2.5.8 Target Size Minimum). The
 * marker is a ~8x18px superscript digit; a transparent ::before overlay
 * makes the clickable area at least 24x24 CSS px without moving the digit
 * or changing the line's leading. A pseudo-element has no bounding rect,
 * so the hit area is measured by hit-testing: every point of a 24x24 box
 * centred on the marker must resolve to the marker itself.
 */
test.describe('sidenote marker hit area', () => {
  for (const width of [375, 1280]) {
    test(`is at least 24x24 and adds no layout (${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('writing/why-17px-and-38rem');
      const ref = page.locator('.remarque-sidenote-ref').first();
      await ref.scrollIntoViewIfNeeded();

      const geometry = () =>
        ref.evaluate((el) => {
          const p = el.closest('p')!;
          const r = el.getBoundingClientRect();
          const pr = p.getBoundingClientRect();
          return { x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height, ph: pr.height, lh: getComputedStyle(p).lineHeight };
        });

      const withTarget = await geometry();
      // Hit-test a 24x24 box centred on the marker: nine points, corners included.
      const hits = await ref.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const out: boolean[] = [];
        for (const dx of [-11.5, 0, 11.5]) for (const dy of [-11.5, 0, 11.5]) {
          const hit = document.elementFromPoint(cx + dx, cy + dy);
          out.push(!!hit && (hit === el || el.contains(hit)));
        }
        return out;
      });
      expect(hits, 'all nine points of a 24x24 box centred on the marker hit the marker').toEqual(Array(9).fill(true));

      // Same page with the overlay removed: the marker's own box and its
      // paragraph's height (the line's leading) must be identical.
      await page.addStyleTag({ content: '.remarque-sidenote-ref::before{display:none !important}.remarque-sidenote-ref{position:static !important}' });
      const without = await geometry();
      expect(withTarget.ph, 'paragraph height').toBe(without.ph);
      expect(withTarget.lh, 'line-height').toBe(without.lh);
      expect(withTarget.x, 'marker x').toBeCloseTo(without.x, 1);
      expect(withTarget.y, 'marker y').toBeCloseTo(without.y, 1);
      expect(withTarget.w, 'marker width').toBeCloseTo(without.w, 1);
      expect(withTarget.h, 'marker height').toBeCloseTo(without.h, 1);
    });
  }
});
