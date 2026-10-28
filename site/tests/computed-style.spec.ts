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
  test('reading column max-width <= 38rem', async ({ page }) => {
    await gotoWithTheme(page, 'writing/typography-as-interface', 'light');

    const { maxWidthPx, rootFontSizePx } = await page.evaluate(() => {
      const el = document.querySelector('.remarque-prose.content-reading');
      if (!el) throw new Error('.remarque-prose.content-reading not found on the Essay page');
      return {
        maxWidthPx: parseFloat(getComputedStyle(el).maxWidth),
        rootFontSizePx: parseFloat(getComputedStyle(document.documentElement).fontSize),
      };
    });

    expect(maxWidthPx).toBeLessThanOrEqual(38 * rootFontSizePx + 0.5);
  });

  // REMARQUE.md "Measure Compensation": the invariant is the MEASURED
  // character count, not the rem value — `ch` arithmetic said 46rem ≈ 70
  // when it actually set 86. Count rendered characters per line.
  test('body lines measure a median of 66–72 characters', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const counts: number[] = [];
    for (const path of ['writing/typography-as-interface', 'writing/against-decoration']) {
      await gotoWithTheme(page, path, 'light');
      await page.evaluate(() => document.fonts.ready);
      counts.push(...(await page.evaluate(() => {
        const out: number[] = [];
        for (const para of document.querySelectorAll('.remarque-prose > p')) {
          const lines = new Map<number, number>();
          const walker = document.createTreeWalker(para, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode as Text;
            if (node.parentElement?.closest('code, sup, .remarque-sidenote')) continue;
            for (let i = 0; i < node.length; i++) {
              const range = document.createRange();
              range.setStart(node, i);
              range.setEnd(node, i + 1);
              const rect = range.getClientRects()[0];
              if (rect) lines.set(Math.round(rect.top), (lines.get(Math.round(rect.top)) ?? 0) + 1);
            }
          }
          out.push(...[...lines.values()].slice(0, -1)); // drop the short last line
        }
        return out;
      })));
    }
    counts.sort((a, b) => a - b);
    const median = counts[Math.floor(counts.length / 2)];
    expect(counts.length).toBeGreaterThan(20);
    expect(median).toBeGreaterThanOrEqual(66);
    expect(median).toBeLessThanOrEqual(72);
  });
});

test.describe('essay module — TOC rail never intrudes into the reading column', () => {
  test('rail sits fully clear of .remarque-prose at the >= 80rem breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoWithTheme(page, 'writing/typography-as-interface', 'light');

    const { proseRight, tocLeft, tocRight, viewportWidth } = await page.evaluate(() => {
      const prose = document.querySelector('.remarque-prose.content-reading');
      const toc = document.querySelector('.remarque-toc-rail');
      if (!prose) throw new Error('.remarque-prose.content-reading not found on the Essay page');
      if (!toc) throw new Error('.remarque-toc-rail not found on the Essay page');
      return {
        proseRight: prose.getBoundingClientRect().right,
        tocLeft: toc.getBoundingClientRect().left,
        tocRight: toc.getBoundingClientRect().right,
        viewportWidth: document.documentElement.clientWidth,
      };
    });

    // REMARQUE.md "Essay Module": the rail lives OUTSIDE --content-reading —
    // that is the entire point of the module. It must sit strictly to the
    // right of the reading column, and stay on-screen (no horizontal
    // overflow introduced by the grid/float mechanics).
    expect(tocLeft).toBeGreaterThan(proseRight);
    expect(tocRight).toBeLessThanOrEqual(viewportWidth);
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
        // WCAG 2.5.5 governs visible/operable targets, not ones a page
        // deliberately doesn't render at a given viewport (a 0x0 box).
        // `offsetParent === null` is the standard "not actually visible"
        // check (also true for `position: fixed` elements, none of which
        // appear in this nav/footer).
        function isRendered(el: Element) {
          return (el as HTMLElement).offsetParent !== null;
        }
        const out: { label: string; width: number; height: number }[] = [];
        const toggle = document.querySelector('#theme-toggle');
        if (toggle) out.push({ label: 'theme-toggle', ...box(toggle) });
        document.querySelectorAll('.nav-link').forEach((el) => {
          if (isRendered(el)) out.push({ label: `nav-link:${el.textContent?.trim()}`, ...box(el) });
        });
        document.querySelectorAll('.footer-link').forEach((el) => {
          if (isRendered(el)) out.push({ label: `footer-link:${el.textContent?.trim()}`, ...box(el) });
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

test.describe('palette deck (remarque-tokens/deck, issue #56)', () => {
  test('data-palette FOUC guard is a synchronous inline <head> script', async ({ page }) => {
    // Same static shape as the theme FOUC guard above — must be a
    // classic (non-async/defer/module) inline script physically in
    // <head>, or the stored choice would flash the default palette first.
    const response = await page.request.get('tokens');
    expect(response.ok()).toBeTruthy();
    const rawHtml = await response.text();
    const headHtml = rawHtml.slice(0, rawHtml.indexOf('</head>'));
    expect(headHtml).toMatch(/<script>\s*\(function\s*\(\)\s*\{[\s\S]*?data-palette/);
    expect(headHtml).not.toMatch(/<script[^>]+(async|defer|type=["']module["'])[^>]*>[\s\S]*?data-palette/);
  });

  // The picker (remarque-deck + deck.js bindPicker, 0.31) sits in every
  // page's footer: a <details> of native radio inputs.
  const openPicker = async (page) => {
    await page.locator('#palette-picker summary').click();
    return page.locator('#palette-picker');
  };

  test('picker is native radios, keyboard-operable, every option >= 44px tall', async ({ page }) => {
    await gotoWithTheme(page, 'tokens', 'light');
    const picker = await openPicker(page);
    const options = picker.locator('.remarque-deck-option');
    expect(await options.count()).toBeGreaterThanOrEqual(10);
    for (const box of await options.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
      expect(box).toBeGreaterThanOrEqual(44);
    }
    const first = picker.locator('input[type="radio"]').first();
    await first.focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('html')).toHaveAttribute('data-palette', /.+/);
  });

  test('choosing a palette sets data-palette, persists, and survives reload', async ({ page }) => {
    await gotoWithTheme(page, 'tokens', 'light');
    const picker = await openPicker(page);
    await picker.locator('input[value="gruvbox"]').check();

    await expect(page.locator('html')).toHaveAttribute('data-palette', 'gruvbox');
    expect(await page.evaluate(() => localStorage.getItem('remarque-palette'))).toBe('gruvbox');
    await expect(picker.locator('[data-deck-current]')).toHaveText('Gruvbox');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'gruvbox');
    await expect(page.locator('#palette-picker input[value="gruvbox"]')).toBeChecked();

    await (await openPicker(page)).locator('input[value=""]').check();
    await expect(page.locator('html')).not.toHaveAttribute('data-palette', /.*/);
  });

  test('a deck palette follows the light/dark toggle (light-dark(), not a fixed mode)', async ({ page }) => {
    const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await gotoWithTheme(page, 'tokens', 'light');
    const defaultLight = await bodyBg();
    await (await openPicker(page)).locator('input[value="rose-pine"]').check();
    const light = await bodyBg();
    // The palette must win over the site's own :root palette in LIGHT mode
    // too. Until 0.31 the scoped block was (0,1,0), tied with :root, and
    // lost to any palette loaded after it; only the dark block won.
    expect(light).not.toBe(defaultLight);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    const dark = await bodyBg();
    expect(dark).not.toBe(light);
    // ...and both differ from the default palette in the same mode.
    await page.evaluate(() => document.documentElement.removeAttribute('data-palette'));
    expect(await bodyBg()).not.toBe(dark);
  });

  for (const width of [375, 1280]) {
    test(`popover: in the header, panel fully on screen at ${width}px, Escape and outside click close it`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await gotoWithTheme(page, 'tokens', 'light');
      const picker = page.locator('#palette-picker');
      // Discoverable: it sits in the header row, beside the light/dark toggle.
      const top = await picker.evaluate((d) => d.getBoundingClientRect().top);
      expect(top).toBeLessThan(120);
      await picker.locator('summary').click();
      const box = await picker.locator('fieldset').evaluate((f) => f.getBoundingClientRect().toJSON());
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width);
      expect(box.bottom).toBeLessThanOrEqual(800);
      await page.keyboard.press('Escape');
      expect(await picker.evaluate((d) => (d as HTMLDetailsElement).open)).toBe(false);
      await expect(picker.locator('summary')).toBeFocused();
      await picker.locator('summary').click();
      await page.mouse.click(5, 790);
      expect(await picker.evaluate((d) => (d as HTMLDetailsElement).open)).toBe(false);
    });
  }

  test("swatches show each palette's own colors, not the active palette's", async ({ page }) => {
    await gotoWithTheme(page, 'tokens', 'light');
    const picker = await openPicker(page);
    const sw = (name) => picker.locator(`[data-palette-swatch="${name}"] > span`).first().evaluate((e) => getComputedStyle(e).backgroundColor);
    const nordBefore = await sw('nord');
    await picker.locator('input[value="gruvbox"]').check();
    expect(await sw('nord')).toBe(nordBefore);
    expect(await sw('nord')).not.toBe(await sw('gruvbox'));
  });
});

/* ── 2026-10 design review (Open Design → gstack design-review) ──────
   Each block below guards a defect the review found shipped. */

const ALL_PATHS = ['', 'start', 'writing', 'writing/typography-as-interface', 'writing/against-decoration',
  'writing/why-17px-and-38rem', 'writing/palettes-as-data',
  'projects', 'projects/remarque', 'projects/oklch-terminal-themes', 'notes', 'specimen', 'tokens', 'components'];

test.describe('no horizontal scroll at 375px', () => {
  for (const path of ALL_PATHS) {
    test(`/${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await gotoWithTheme(page, path, 'light');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('meta register renders at --text-meta', () => {
  // AGENT_RULES Pitfall #8: text-[var(--text-meta)] compiles to a color
  // and sets no size — 134 demo elements rendered at 17px body size.
  test('footer meta line computes to the --text-meta size', async ({ page }) => {
    await gotoWithTheme(page, PAGES[0].path, 'light');
    const { size, token } = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.fontSize = 'var(--text-meta)';
      document.body.appendChild(probe);
      const token = parseFloat(getComputedStyle(probe).fontSize);
      probe.remove();
      return { size: parseFloat(getComputedStyle(document.querySelector('footer p')!).fontSize), token };
    });
    expect(token).toBeCloseTo(14, 0);
    expect(size).toBe(token);
  });
});

test.describe('nav wayfinding', () => {
  test('section index is aria-current="page"; a page inside it marks the section "true"', async ({ page }) => {
    await gotoWithTheme(page, 'writing', 'light');
    expect(await page.locator('header nav a[aria-current]').evaluateAll((as) => as.map((a) => `${a.textContent?.trim()}=${a.getAttribute('aria-current')}`))).toEqual(['Writing=page']);
    await gotoWithTheme(page, 'projects/remarque', 'light');
    expect(await page.locator('header nav a[aria-current]').evaluateAll((as) => as.map((a) => `${a.textContent?.trim()}=${a.getAttribute('aria-current')}`))).toEqual(['Projects=true']);
  });
});

test.describe('essay module — TOC rail focus rings (issue #115)', () => {
  test('a focused rail link’s ring stays inside the rail’s scroll box', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoWithTheme(page, 'writing/typography-as-interface', 'light');
    const link = page.locator('.remarque-toc-rail a').first();
    await link.focus();
    const gap = await link.evaluate((a) => {
      const rail = a.closest('.remarque-toc-rail')!;
      const cs = getComputedStyle(a);
      const reach = parseFloat(cs.outlineWidth) + parseFloat(cs.outlineOffset);
      const r = a.getBoundingClientRect();
      const box = rail.getBoundingClientRect();
      return Math.min(r.left - reach - box.left, box.right - (r.right + reach), r.top - reach - box.top);
    });
    expect(gap).toBeGreaterThanOrEqual(0);
  });
});

test.describe('404 page', () => {
  test('unknown routes get the site chrome and a way home', async ({ page }) => {
    const res = await page.goto('does-not-exist');
    expect(res?.status()).toBe(404);
    await expect(page.locator('header nav[aria-label="Main navigation"]')).toBeVisible();
    await expect(page.locator('main a', { hasText: 'Home' })).toBeVisible();
  });
});
