import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Drop cap fit (0.33; the 2026-10-28 study, vote-1793200470008-hiqgebl).
 *
 * The contract, for the prose drop cap (`.remarque-prose--dropcap`) and the
 * broadsheet lede (`.remarque-lead-lede`): the capital's INK top sits on the
 * first line's cap-height and its foot on line 3's baseline (line 2's, for
 * the `--short` two-line variant), within 2px. Measured, not read from the
 * CSS: the cap is screenshotted with and without its colour (the pixels that
 * differ are the cap's ink), and the body baselines come from the text
 * ranges plus the body face's font metrics.
 *
 * Runs in all three engines (playwright.config.ts): Chromium and WebKit use
 * `initial-letter`; Firefox has none (MDN browser-compat-data, 8.1.7) and
 * renders the float fallback, which is the part that needs measuring.
 *
 * Faces: Newsreader (the default display face) and Fraunces (the approved
 * substitute, REMARQUE.md "Font Slots"; tests/fixtures/ carries its italic,
 * SIL OFL, because the demo does not ship it). Letters are flat-footed
 * capitals (H, B): a swashed or overshooting glyph (Newsreader's E drops
 * 0.03em below its baseline, its M and A carry swash feet) measures its own
 * design, not the fit.
 */

const TOL = 2;
// The Firefox float fallback is tuned on the default face; the approved
// substitute's own hhea metrics leave it up to 0.5px further out
// (REMARQUE.md "Drop Caps" records the measured residual).
const TOL_FALLBACK_SUBSTITUTE = 2.5;

const FRAUNCES = readFileSync(fileURLToPath(new URL('./fixtures/fraunces-italic.woff2', import.meta.url)));

const LEAD =
  'ox jumps over the lazy dog while an unreasonably patient committee reads every word of a very long sentence about typography, leading, measure and the small decisions that make a page feel set rather than merely poured into a box. A second sentence keeps the paragraph going for several more lines so the drop cap has body text to sit beside, and a third makes sure of it. Then a fourth, for good measure, so that no viewport width runs the paragraph short of lines.';

type Face = 'Newsreader' | 'Fraunces';
const FACES: Face[] = ['Newsreader', 'Fraunces'];
const LETTERS = ['H', 'B'];
const WIDTHS = [768, 1280];

async function setUp(page: Page, face: Face, base: string) {
  await page.route('**/__fixtures__/fraunces-italic.woff2', (r) => r.fulfill({ body: FRAUNCES, contentType: 'font/woff2' }));
  await page.goto('writing/typography-as-interface');
  await page.addStyleTag({
    content: `@font-face{font-family:"TestFraunces";font-style:italic;font-weight:100 900;src:url(${new URL('__fixtures__/fraunces-italic.woff2', base).href}) format("woff2")}`,
  });
  await page.evaluate((f) => {
    document.documentElement.style.setProperty('--font-display', f === 'Fraunces' ? '"TestFraunces", serif' : '"Newsreader", serif');
  }, face);
}

interface Row { engine: string; face: Face; kind: string; variant: string; letter: string; width: number; top: number; foot: number; }

async function measure(page: Page, opts: { kind: 'prose' | 'lede'; short: boolean; letter: string; width: number }): Promise<{ top: number; foot: number }> {
  await page.setViewportSize({ width: opts.width, height: 900 });
  await page.evaluate(
    ({ kind, short, letter, lead }) => {
      const cls = (short ? 'remarque-dropcap--short' : '');
      document.body.innerHTML =
        kind === 'prose'
          ? `<div class="remarque-prose remarque-prose--dropcap" style="max-width:38rem;margin:0 auto;padding:24px"><p id="lead" class="${cls}">${letter}${lead}</p><p>The next paragraph.</p></div>`
          : `<div class="remarque-lead" style="max-width:38rem;margin:0 auto;padding:24px"><p id="lead" class="remarque-lead-lede ${cls}">${letter}${lead}</p></div>`;
    },
    { kind: opts.kind, short: opts.short, letter: opts.letter, lead: LEAD },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => document.fonts.load('italic 100px TestFraunces').catch(() => undefined));
  const info = await page.evaluate(() => {
    const p = document.getElementById('lead')!;
    const cs = getComputedStyle(p);
    const r = p.getBoundingClientRect();
    const t = p.firstChild as Text;
    const rng = document.createRange();
    rng.setStart(t, 1);
    rng.setEnd(t, t.length);
    const tops: number[] = [];
    const rects: DOMRect[] = [];
    for (const rc of rng.getClientRects()) {
      if (!tops.some((x) => Math.abs(x - rc.top) < 2)) { tops.push(rc.top); rects.push(rc); }
    }
    rects.sort((a, b) => a.top - b.top);
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = ctx.measureText('H');
    const asc = m.fontBoundingBoxAscent;
    const content = asc + m.fontBoundingBoxDescent;
    return {
      x: r.left, y: r.top, w: r.width, h: Math.min(r.height, 420),
      capBody: m.actualBoundingBoxAscent,
      base: rects.map((rc) => rc.top + (rc.height - content) / 2 + asc),
    };
  });
  const clip = { x: Math.max(0, info.x - 4), y: Math.max(0, info.y - 4), width: info.w + 8, height: info.h + 8 };
  const withCap = await page.screenshot({ clip });
  const tag = await page.addStyleTag({ content: '#lead::first-letter{color:transparent !important}' });
  const withoutCap = await page.screenshot({ clip });
  await tag.evaluate((n) => n.remove());
  const ink = await page.evaluate(async ([a, b]) => {
    const load = async (s: string) => {
      const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob());
      const cv = document.createElement('canvas');
      cv.width = bm.width; cv.height = bm.height;
      const x = cv.getContext('2d')!;
      x.drawImage(bm, 0, 0);
      return x.getImageData(0, 0, bm.width, bm.height);
    };
    const A = await load(a), B = await load(b);
    let minY = Infinity, maxY = -1;
    for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
      const i = (y * A.width + x) * 4;
      const d = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]);
      if (d > 120) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    // Screenshots are in device pixels (Playwright's Safari profile is 2x).
    return { minY: minY / devicePixelRatio, maxY: (maxY + 1) / devicePixelRatio };
  }, [withCap.toString('base64'), withoutCap.toString('base64')]);
  expect(ink.maxY, 'the drop cap rendered ink').toBeGreaterThan(1);
  const lines = opts.short ? 2 : 3;
  expect(info.base.length, 'lead wraps to at least 4 lines').toBeGreaterThan(3);
  const top = clip.y + ink.minY - (info.base[0] - info.capBody);
  const foot = clip.y + ink.maxY - info.base[lines - 1];
  return { top: +top.toFixed(1), foot: +foot.toFixed(1) };
}

test.describe('drop cap fit: ink top on line-1 cap-height, foot on the baseline of line 3 (2 if short)', () => {
  for (const face of FACES) {
    for (const kind of ['prose', 'lede'] as const) {
      test(`${kind} cap, ${face}`, async ({ page, browserName, baseURL }) => {
        test.setTimeout(120_000);
        await setUp(page, face, baseURL!);
        const rows: Row[] = [];
        for (const width of WIDTHS) for (const short of [false, true]) for (const letter of LETTERS) {
          const r = await measure(page, { kind, short, letter, width });
          rows.push({ engine: browserName, face, kind, variant: short ? 'short' : 'long', letter, width, ...r });
        }
        for (const r of rows) console.log(`FIT ${r.engine} ${r.face} ${r.kind} ${r.variant} ${r.letter} ${r.width} top=${r.top} foot=${r.foot}`);
        const tol = browserName === 'firefox' && face !== 'Newsreader' ? TOL_FALLBACK_SUBSTITUTE : TOL;
        for (const r of rows) {
          const where = `${r.engine} ${r.face} ${r.kind} ${r.variant} ${r.letter}@${r.width}`;
          expect(Math.abs(r.top), `${where}: cap top vs line-1 cap-height`).toBeLessThanOrEqual(tol);
          expect(Math.abs(r.foot), `${where}: cap foot vs baseline`).toBeLessThanOrEqual(tol);
        }
      });
    }
  }
});

test.describe('drop cap opt-outs', () => {
  test('.no-drop-cap and .remarque-dropcap--none leave the first letter plain; a quote or code opener is skipped', async ({ page }) => {
    await page.goto('writing/typography-as-interface');
    const sizes = await page.evaluate(() => {
      const mk = (cls: string, inner: string) => {
        document.body.innerHTML = `<div class="remarque-prose remarque-prose--dropcap"><p id="p" class="${cls}">${inner}</p></div>`;
        const p = document.getElementById('p')!;
        const fl = getComputedStyle(p, '::first-letter');
        return { fontSize: parseFloat(fl.fontSize), body: parseFloat(getComputedStyle(p).fontSize), fontStyle: fl.fontStyle };
      };
      return {
        cap: mk('', 'Typography matters, and here is a line.'),
        noDropCap: mk('no-drop-cap', 'npm matters, and here is a line.'),
        none: mk('remarque-dropcap--none', 'npm matters, and here is a line.'),
        code: mk('', '<code>npm</code> matters, and here is a line.'),
        quote: mk('', '<q>Typography</q> matters, and here is a line.'),
      };
    });
    expect(sizes.cap.fontSize).toBeGreaterThan(sizes.cap.body * 1.5);
    for (const k of ['noDropCap', 'none', 'code', 'quote'] as const) expect(sizes[k].fontSize, k).toBeCloseTo(sizes[k].body, 1);
  });
});
