import { test, expect } from '@playwright/test';
import { gotoWithTheme } from './helpers';

/** Prose and forms details (issue #129) and the non-color state cue (#128). */

test.describe('forms (issues #128, #129)', () => {
  test('every state message carries its glyph outside forced colors too', async ({ page }) => {
    await gotoWithTheme(page, 'components', 'light');
    const glyphs = await page.evaluate(() => {
      // The demo shows error and success; add a warning field the same way.
      document.querySelector('.remarque-field')!.insertAdjacentHTML('afterend',
        '<div class="remarque-field" data-state="warning"><label class="remarque-field-label" for="t-w">W</label><input class="remarque-input" id="t-w" aria-describedby="t-wm"><p class="remarque-field-message" id="t-wm">Check this.</p></div>');
      return Object.fromEntries(['error', 'warning', 'success'].map((st) => {
        const msg = document.querySelector(`.remarque-field[data-state="${st}"] .remarque-field-message`);
        return [st, msg ? getComputedStyle(msg, '::before').content : 'missing'];
      }));
    });
    expect(glyphs.error).toContain('✕');
    expect(glyphs.warning).toContain('⚠');
    expect(glyphs.success).toContain('✓');
  });

  test('readonly inputs get the bg-subtle fill; autosize opts into field-sizing', async ({ page }) => {
    await gotoWithTheme(page, 'components', 'light');
    const s = await page.evaluate(() => {
      const host = document.querySelector('.remarque-field')!.parentElement!;
      host.insertAdjacentHTML('beforeend', '<input class="remarque-input" id="t-ro" readonly value="x"><textarea class="remarque-input remarque-input--autosize" id="t-auto"></textarea>');
      const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
      const subtle = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-subtle').trim();
      const probe = document.createElement('div');
      probe.style.backgroundColor = subtle;
      document.body.append(probe);
      const want = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return { ro: cs('t-ro').backgroundColor, want, sizing: (cs('t-auto') as any).fieldSizing };
    });
    expect(s.ro).toBe(s.want);
    expect(s.sizing).toBe('content');
  });
});

test.describe('prose details (issue #129)', () => {
  test('code-block title, figure indent, external marks on screen only', async ({ page }) => {
    await gotoWithTheme(page, 'writing/typography-as-interface', 'light');
    await page.evaluate(() => {
      const prose = document.querySelector('.remarque-prose')!;
      prose.classList.add('remarque-prose--external-marks');
      prose.insertAdjacentHTML('afterbegin', `
        <pre id="t-pre" data-title="src/config.ts"><code>export {}</code></pre>
        <figure id="t-fig"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><figcaption>Caption</figcaption></figure>
        <p><a id="t-ext" href="https://example.com/" rel="external">elsewhere</a></p>`);
    });
    const s = await page.evaluate(() => {
      const fig = getComputedStyle(document.getElementById('t-fig')!);
      return {
        title: getComputedStyle(document.getElementById('t-pre')!, '::before').content,
        figL: fig.marginLeft, figR: fig.marginRight,
        mark: getComputedStyle(document.getElementById('t-ext')!, '::after').content,
      };
    });
    expect(s.title).toContain('src/config.ts');
    expect(s.figL).toBe('0px');
    expect(s.figR).toBe('0px');
    expect(s.mark).toContain('↗');

    await page.emulateMedia({ media: 'print' });
    const printed = await page.evaluate(() => getComputedStyle(document.getElementById('t-ext')!, '::after').content);
    expect(printed).not.toContain('↗');
    expect(printed).toContain('example.com');
  });
});
