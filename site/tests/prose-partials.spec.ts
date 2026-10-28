import { test, expect } from '@playwright/test';

/**
 * prose.css @imports dropcap.css, endmark.css and code-title.css (0.33).
 * The partials load before prose.css's own rules, so the cascade has to be
 * checked, not assumed: the one real collision was `.remarque-prose > * + *`
 * (margin-top: --space-5) beating `.remarque-endmark` (--space-7) once the
 * mark stopped coming last.
 */
test('prose partials keep their pre-0.33 computed values inside .remarque-prose', async ({ page }) => {
  await page.goto('writing/typography-as-interface');
  const r = await page.evaluate(() => {
    document.body.innerHTML = `<div class="remarque-prose"><p>Text.</p><pre data-title="src/config.ts"><code>x</code></pre><div class="remarque-endmark" aria-hidden="true"></div></div>`;
    const mark = document.querySelector('.remarque-endmark')!;
    const pre = document.querySelector('pre')!;
    const root = getComputedStyle(document.documentElement);
    const space7 = parseFloat(root.getPropertyValue('--space-7')) * (root.getPropertyValue('--space-7').includes('rem') ? parseFloat(root.fontSize) : 1);
    return {
      endmarkMargin: parseFloat(getComputedStyle(mark).marginTop),
      space7,
      endmarkAfter: getComputedStyle(mark, '::after').content,
      titleContent: getComputedStyle(pre, '::before').content,
      titleDisplay: getComputedStyle(pre, '::before').display,
    };
  });
  expect(r.endmarkMargin).toBe(r.space7);
  expect(r.endmarkAfter).toContain('❦');
  expect(r.titleContent).toBe('"src/config.ts"');
  expect(r.titleDisplay).toBe('block');
});
