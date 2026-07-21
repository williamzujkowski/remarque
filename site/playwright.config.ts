import { defineConfig, devices } from '@playwright/test';

/**
 * Visual regression + computed-style suite for the Remarque demo (issue #49).
 *
 * Screenshot baselines are generated on Linux (the same OS family as the
 * `ubuntu-latest` GitHub Actions runner) and are CI-canonical: if a local
 * run on a different OS/font-set produces diffs, trust the CI result, not
 * the local one. Regenerate baselines via `npm run test:visual:update`
 * (locally on Linux, or by downloading the CI diff artifact) rather than
 * hand-editing them.
 *
 * `astro preview` serves the production build (`npm run build` must run
 * first) so these tests exercise the same static output that ships to
 * GitHub Pages, base path (`/remarque/`) included.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  timeout: 30_000,

  expect: {
    // Small tolerance for subpixel antialiasing jitter across runs.
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },

  use: {
    baseURL: 'http://localhost:4319/remarque/',
    trace: 'retain-on-failure',
    // Zeroes --motion-fast/--motion-normal (tokens-core.css) so no
    // color/opacity transition can be mid-flight during a screenshot.
    reducedMotion: 'reduce',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Port 4319 is deliberately non-default: astro's default (4321/4322) is
  // frequently occupied by unrelated `astro preview` processes from other
  // projects on a shared dev machine, and astro silently falls back to the
  // next free port rather than erroring — which would make this config's
  // hardcoded baseURL point at the wrong server.
  webServer: {
    command: 'npm run preview -- --port 4319 --strictPort',
    url: 'http://localhost:4319/remarque/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
