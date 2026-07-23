import type { Page } from '@playwright/test';

export type Theme = 'light' | 'dark';

export interface Viewport {
  name: string;
  width: number;
  height: number;
}

export const VIEWPORTS: Viewport[] = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1280, height: 900 },
];

export const THEMES: Theme[] = ['light', 'dark'];

export interface PageSpec {
  slug: string;
  path: string;
}

/**
 * The five archetypes named in issue #49: Landing, Essay, Dossier, Notebook,
 * Specimen — plus `broadsheet`, the Broadsheet pattern's reference page
 * (issue #36; `writing/index.astro`, restyled as a broadsheet archive:
 * masthead + lead article + numbered entry list); and `components`, the
 * forms module's reference page (issues #27/#30; `components.astro` —
 * every field state, both button variants, checkbox/radio, and a
 * standalone table). Paths are deliberately relative WITHOUT a leading
 * slash — with `baseURL` set to `.../remarque/` (the Astro base path), a
 * leading slash would resolve against the origin root and silently drop
 * `/remarque/`.
 */
export const PAGES: PageSpec[] = [
  { slug: 'landing', path: '' },
  { slug: 'essay', path: 'writing/typography-as-interface' },
  { slug: 'dossier', path: 'projects/remarque' },
  { slug: 'notebook', path: 'notes' },
  { slug: 'specimen', path: 'specimen' },
  { slug: 'broadsheet', path: 'writing' },
  { slug: 'components', path: 'components' },
];

/**
 * Navigate to `path` with `data-theme` already resolved before first paint,
 * then pin it directly to `theme` — avoids driving the toggle button (icon
 * swap + hover transition) purely to get into the target theme.
 */
export async function gotoWithTheme(page: Page, path: string, theme: Theme): Promise<void> {
  // Pre-seed localStorage so the page's own inline head script (the FOUC
  // guard under test in computed-style.spec.ts) resolves to `theme` on its
  // own, rather than us overriding its result afterward.
  await page.addInitScript((t) => {
    window.localStorage.setItem('theme', t);
  }, theme);

  await page.goto(path);

  // Belt-and-suspenders: set data-theme directly so the rendered state is
  // deterministic even if localStorage/matchMedia timing ever changes.
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
  }, theme);

  await page.evaluate(() => document.fonts.ready);
}
