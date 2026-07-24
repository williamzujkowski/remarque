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
  const out = execFileSync('npm', ['pack', '--pack-destination', packDir], { encoding: 'utf8', stdio: 'pipe' });
  const tarballName = out.trim().split('\n').pop().trim();
  tarballPath = join(packDir, tarballName);
  expect(`npm pack produced a tarball (${tarballName})`, existsSync(tarballPath));
} catch (e) {
  expect('npm pack succeeded', false, e.stderr?.toString() || e.message);
}

// The two Claude Code skills (issue #107) must land in the tarball —
// `npm pack`'s own "prepack" lifecycle hook runs scripts/build-skills.mjs
// first, so this also transitively proves that hook actually fires
// (rather than relying on a committed skills/ dir happening to be fresh).
if (tarballPath && existsSync(tarballPath)) {
  try {
    const listing = execFileSync('tar', ['-tzf', tarballPath], { encoding: 'utf8' });
    for (const p of ['package/skills/remarque/SKILL.md', 'package/skills/remarque-adopt/SKILL.md']) {
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
      { cwd: consumerDir, stdio: 'pipe' }
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

  for (const p of ['skills/remarque/SKILL.md', 'skills/remarque-adopt/SKILL.md']) {
    const installedPath = join(consumerDir, 'node_modules', 'remarque-tokens', p);
    expect(`installed package ships ${p} (resolves the "./skills/${p.includes('adopt') ? 'adopt' : 'remarque'}" export)`, existsSync(installedPath) && readFileSync(installedPath, 'utf8').length > 0);
  }

  const outCss = join(consumerDir, 'out.css');
  try {
    execFileSync('npx', ['remarque-theme', 'remarque-light', '-o', outCss], { cwd: consumerDir, stdio: 'pipe' });
    expect('npx remarque-theme remarque-light -o out.css succeeds from the installed tarball', existsSync(outCss));
  } catch (e) {
    expect('npx remarque-theme remarque-light -o out.css succeeds from the installed tarball', false, e.stderr?.toString() || e.message);
  }

  if (existsSync(outCss)) {
    try {
      const auditOut = execFileSync('npx', ['remarque-audit', '--palette', outCss, '--src', '.', '--json'], { cwd: consumerDir, encoding: 'utf8', stdio: 'pipe' });
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
}

rmSync(scratch, { recursive: true, force: true });

if (bad) {
  console.error(`test-pack FAILED — ${bad} check(s) did not pass`);
  process.exit(1);
}
console.log('test-pack passed ✓');
