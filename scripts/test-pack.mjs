#!/usr/bin/env node
/*
 * Consumer smoke test — packs the ACTUAL npm tarball (not the repo
 * checkout, not a devDependency install) and installs it into a scratch
 * project alongside the pinned @williamzujkowski/oklch-terminal-themes
 * devDependency version, exactly the way a real consumer would:
 *
 *   npm pack                                    # -> remarque-tokens-<version>.tgz
 *   npm install <tarball> @williamzujkowski/oklch-terminal-themes@<pinned>
 *   npx remarque-theme remarque-light -o out.css
 *   npx remarque-audit --palette out.css --src . --json
 *
 * No --legacy-peer-deps, deliberately — the entire point of this test is
 * that npm's real peer-dependency resolution succeeds. This exists
 * because package.json's peerDependencies range (">=0.1.0 <0.3.0", set at
 * the dataset's 0.1.0 and never widened) went stale as the dataset
 * shipped 0.4.0/0.5.0 — this repo's own devDependency pin never exercises
 * peer resolution (`npm ci` here installs both packages directly, no
 * peer check), so the break was invisible until a real `npm install`
 * consumer flow was tried. This test is that flow, run in CI on every
 * change, so the class can't recur silently again.
 *
 * Requires network (registry.npmjs.org) — wired into deploy.yml after the
 * other gates, where devDependencies (including the pinned dataset
 * version this test reads) are already being installed from the same
 * registry.
 *
 * Run: node scripts/test-pack.mjs
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Under `npm test` the parent npm exports npm_config_* / npm_package_* (local
// prefix included), and child npm/npx calls inherit them: the consumer
// install below would resolve against this repo instead of consumerDir.
// Children get the environment a user's shell would have.
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^npm_/i.test(k)));

let bad = 0;
function expect(label, cond, detail = '') {
  const ok = !!cond;
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : ` — ${detail}`}`);
  if (!ok) bad++;
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const PINNED_DATASET_VERSION = pkg.devDependencies['@williamzujkowski/oklch-terminal-themes'];
expect('package.json pins an exact @williamzujkowski/oklch-terminal-themes devDependency version', /^\d+\.\d+\.\d+$/.test(PINNED_DATASET_VERSION), PINNED_DATASET_VERSION);

const scratch = mkdtempSync(join(tmpdir(), 'remarque-pack-test-'));
const packDir = join(scratch, 'pack');
const consumerDir = join(scratch, 'consumer');
mkdirSync(packDir, { recursive: true });
mkdirSync(consumerDir, { recursive: true });

let tarballPath;
try {
  // `npm pack` from the repo root, output directed into packDir — packs
  // exactly what package.json's "files" ships, not the working tree.
  const out = execFileSync('npm', ['pack', '--pack-destination', packDir], { encoding: 'utf8', stdio: 'pipe', env });
  const tarballName = out.trim().split('\n').pop().trim();
  tarballPath = join(packDir, tarballName);
  expect(`npm pack produced a tarball (${tarballName})`, existsSync(tarballPath));
} catch (e) {
  expect('npm pack succeeded', false, e.stderr?.toString() || e.message);
}

// The three Claude Code skills (issues #107, #108) must land in the
// tarball — `npm pack`'s own "prepack" lifecycle hook runs
// scripts/build-skills.mjs first, so this also transitively proves that
// hook actually fires (rather than relying on a committed skills/ dir
// happening to be fresh).
if (tarballPath && existsSync(tarballPath)) {
  try {
    const listing = execFileSync('tar', ['-tzf', tarballPath], { encoding: 'utf8' });
    for (const p of ['package/skills/remarque/SKILL.md', 'package/skills/remarque-adopt/SKILL.md', 'package/skills/remarque-new-page/SKILL.md', 'package/deck/deck.css', 'package/deck/deck.json', 'package/deck/curated.json', 'package/scripts/deck.mjs', 'package/dropcap.css', 'package/endmark.css', 'package/code-title.css']) {
      expect(`tarball contains ${p}`, listing.includes(p));
    }
  } catch (e) {
    expect('tarball listing (tar -tzf) succeeded', false, e.stderr?.toString() || e.message);
  }
}

if (tarballPath && existsSync(tarballPath)) {
  writeFileSync(join(consumerDir, 'package.json'), JSON.stringify({ name: 'remarque-pack-test-consumer', version: '0.0.0', private: true }, null, 2));

  try {
    // THE assertion: real peer-dependency resolution, no escape hatch.
    execFileSync(
      'npm',
      ['install', tarballPath, `@williamzujkowski/oklch-terminal-themes@${PINNED_DATASET_VERSION}`, '--no-audit', '--no-fund'],
      { cwd: consumerDir, stdio: 'pipe', env }
    );
    expect(
      `npm install <tarball> @williamzujkowski/oklch-terminal-themes@${PINNED_DATASET_VERSION} succeeds with NO --legacy-peer-deps (peerDependencies range is satisfied)`,
      true
    );
  } catch (e) {
    expect(
      `npm install <tarball> @williamzujkowski/oklch-terminal-themes@${PINNED_DATASET_VERSION} succeeds with NO --legacy-peer-deps (peerDependencies range is satisfied)`,
      false,
      e.stderr?.toString() || e.message
    );
  }

  for (const p of ['skills/remarque/SKILL.md', 'skills/remarque-adopt/SKILL.md', 'skills/remarque-new-page/SKILL.md']) {
    const installedPath = join(consumerDir, 'node_modules', 'remarque-tokens', p);
    const exportName = p.includes('new-page') ? 'new-page' : p.includes('adopt') ? 'adopt' : 'remarque';
    expect(`installed package ships ${p} (resolves the "./skills/${exportName}" export)`, existsSync(installedPath) && readFileSync(installedPath, 'utf8').length > 0);
  }

  const outCss = join(consumerDir, 'out.css');
  try {
    execFileSync('npx', ['remarque-theme', 'remarque-light', '-o', outCss], { cwd: consumerDir, stdio: 'pipe', env });
    expect('npx remarque-theme remarque-light -o out.css succeeds from the installed tarball', existsSync(outCss));
  } catch (e) {
    expect('npx remarque-theme remarque-light -o out.css succeeds from the installed tarball', false, e.stderr?.toString() || e.message);
  }

  if (existsSync(outCss)) {
    try {
      const auditOut = execFileSync('npx', ['remarque-audit', '--palette', outCss, '--src', '.', '--json'], { cwd: consumerDir, encoding: 'utf8', stdio: 'pipe', env });
      let report;
      try {
        report = JSON.parse(auditOut);
        expect('npx remarque-audit --json produces parseable JSON', true);
      } catch {
        expect('npx remarque-audit --json produces parseable JSON', false, auditOut.slice(0, 500));
      }
      expect('npx remarque-audit --json reports passed: true', report?.passed === true, JSON.stringify(report?.failures));
    } catch (e) {
      // A nonzero exit only fails this check if the JSON itself also says
      // failed — re-parse stdout from the thrown error so a genuine audit
      // failure is reported with the real reason, not just "it exited 1".
      let report;
      try {
        report = JSON.parse(e.stdout?.toString() || '');
      } catch {
        /* fall through to the false expect below */
      }
      expect('npx remarque-audit --palette out.css --src . --json exits 0 with passed: true', false, report ? JSON.stringify(report.failures) : e.stderr?.toString() || e.message);
    }
  }

  // The prose partials (0.33): dropcap, endmark and code-title are their own
  // subpaths AND are @imported by prose.css. Each must resolve through its
  // export from the installed tarball, hold its rule, and every file
  // prose.css imports must exist in the install (a missing partial would
  // silently unstyle every prose.css consumer).
  {
    const installed = join(consumerDir, 'node_modules', 'remarque-tokens');
    const partials = [['dropcap', 'dropcap.css', '.remarque-prose--dropcap'], ['endmark', 'endmark.css', '.remarque-endmark'], ['code-title', 'code-title.css', 'pre[data-title]']];
    for (const [name, file, needle] of partials) {
      for (const spec of [`remarque-tokens/${name}`, `remarque-tokens/${file}`]) {
        try {
          const url = execFileSync('node', ['--input-type=module', '-e', `console.log(import.meta.resolve(${JSON.stringify(spec)}))`], { cwd: consumerDir, encoding: 'utf8', env }).trim();
          const css = readFileSync(new URL(url), 'utf8');
          expect(`${spec} resolves from the installed tarball to ${file} and holds ${needle}`, url.endsWith(`/${file}`) && css.includes(needle), url);
        } catch (e) {
          expect(`${spec} resolves from the installed tarball`, false, e.stderr?.toString() || e.message);
        }
      }
    }
    const prose = readFileSync(join(installed, 'prose.css'), 'utf8');
    const imported = [...prose.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/@import\s+['"]\.\/([^'"]+)['"]/g)].map((m) => m[1]);
    expect('prose.css @imports the three partials', ['dropcap.css', 'endmark.css', 'code-title.css'].every((f) => imported.includes(f)), imported.join(', '));
    for (const f of imported) expect(`prose.css's @import ./${f} is in the installed package`, existsSync(join(installed, f)));
    for (const [, file, needle] of partials) {
      expect(`prose.css itself no longer carries the ${file} rule (one copy)`, !prose.replace(/\/\*[\s\S]*?\*\//g, '').includes(needle));
    }
  }

  // The Palette Deck (0.31): a custom deck builds from the installed
  // tarball against the installed dataset, and the prebuilt curated deck
  // resolves through its export.
  try {
    const deckDir = join(consumerDir, 'deck-out');
    execFileSync('npx', ['remarque-deck', 'nord-light', '--out-dir', deckDir], { cwd: consumerDir, stdio: 'pipe', env });
    expect('npx remarque-deck <slug> --out-dir builds a deck from the installed tarball', existsSync(join(deckDir, 'deck.css')) && existsSync(join(deckDir, 'deck.json')));
  } catch (e) {
    expect('npx remarque-deck <slug> --out-dir builds a deck from the installed tarball', false, e.stderr?.toString() || e.message);
  }
  try {
    const resolved = execFileSync('node', ['--input-type=module', '-e', "console.log(import.meta.resolve('remarque-tokens/deck.css'), import.meta.resolve('remarque-tokens/deck.json'))"], { cwd: consumerDir, encoding: 'utf8', env });
    expect('remarque-tokens/deck.css and /deck.json resolve to the prebuilt curated deck', /deck\/deck\.css/.test(resolved) && /deck\/deck\.json/.test(resolved), resolved);
  } catch (e) {
    expect('remarque-tokens/deck.css and /deck.json resolve to the prebuilt curated deck', false, e.stderr?.toString() || e.message);
  }
}

rmSync(scratch, { recursive: true, force: true });

if (bad) {
  console.error(`test-pack FAILED — ${bad} check(s) did not pass`);
  process.exit(1);
}
console.log('test-pack passed ✓');
