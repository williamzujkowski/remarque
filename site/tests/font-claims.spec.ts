import { test, expect } from '@playwright/test';
import { gotoWithTheme } from './helpers';

/**
 * Labels don't synthesize small caps (issue #124). The default mono face
 * has no smcp/c2sc, so every label voice is tracked capitals; remarque-audit
 * gates the CSS, this checks what the demo actually renders.
 */
const LABELS: [string, string][] = [
  ['writing', '.remarque-masthead-kicker'],
  ['writing', '.remarque-lead-kicker'],
  ['writing/typography-as-interface', '.remarque-toc-rail summary'],
  ['components', '.remarque-field-label'],
];

test.describe('labels are tracked capitals, never synthesized small caps (issue #124)', () => {
  for (const [path, sel] of LABELS) {
    test(`${sel} on /${path}`, async ({ page }) => {
      await gotoWithTheme(page, path, 'light');
      const s = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) throw new Error(`${sel} not found`);
        const cs = getComputedStyle(el);
        return { caps: cs.fontVariantCaps, transform: cs.textTransform, size: parseFloat(cs.fontSize) };
      }, sel);
      expect(s.caps).toBe('normal');
      expect(s.transform).toBe('uppercase');
      expect(s.size).toBeGreaterThanOrEqual(14);
    });
  }
});
