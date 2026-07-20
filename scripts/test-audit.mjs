#!/usr/bin/env node
/*
 * Fixture tests for remarque-audit's palette parsing — both theme
 * conventions plus a must-fail case. Run: node scripts/test-audit.mjs
 * (wired into deploy.yml). Exit 1 on any unexpected outcome.
 */

import { writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'remarque-audit-test-'));
mkdirSync(join(dir, 'src'), { recursive: true });

const LIGHT = `:root {
  --color-bg: oklch(0.975 0.005 80);
  --color-bg-subtle: oklch(0.955 0.005 80);
  --color-fg: oklch(0.18 0.01 80);
  --color-fg-muted: oklch(0.43 0.015 80);
  --color-muted: oklch(0.54 0.01 80);
  --color-border: oklch(0.88 0.005 80);
  --color-border-bold: oklch(0.62 0.01 80);
  --color-surface: oklch(0.965 0.005 80);
  --color-accent: oklch(0.50 0.14 250);
  --color-accent-hover: oklch(0.42 0.11 250);
  --color-selection-bg: oklch(0.92 0.04 250);
  --color-selection-fg: var(--color-fg);
  --color-code-bg: oklch(0.945 0.005 80);
  --color-code-fg: var(--color-fg);
}`;
const DARK_DECLS = `
  --color-bg: oklch(0.16 0.01 80);
  --color-fg: oklch(0.90 0.005 80);
  --color-fg-muted: oklch(0.70 0.01 80);
  --color-muted: oklch(0.60 0.01 80);
  --color-border-bold: oklch(0.50 0.01 80);
  --color-surface: oklch(0.19 0.01 80);
  --color-accent: oklch(0.68 0.12 250);
  --color-accent-hover: oklch(0.75 0.12 250);
  --color-selection-bg: oklch(0.30 0.06 250);
  --color-selection-fg: oklch(0.92 0.005 80);
  --color-code-bg: oklch(0.20 0.005 80);
  --color-code-fg: oklch(0.88 0.005 80);
`;

const cases = [
  ['attr-convention.css', `${LIGHT}\n[data-theme="dark"] {${DARK_DECLS}}`, true],
  ['class-convention.css', `${LIGHT}\n:root.dark {${DARK_DECLS}}`, true],
  ['media-convention.css', `${LIGHT}\n@media (prefers-color-scheme: dark) { :root {${DARK_DECLS}} }`, true],
  // :root.dark must NOT pollute the light theme: light fg-muted here fails AAA,
  // so if dark values leaked into light (the old .includes(':root') bug hid
  // this), the failure would disappear. Expect FAIL for the light theme.
  ['light-fails.css', `${LIGHT.replace('--color-fg-muted: oklch(0.43 0.015 80);', '--color-fg-muted: oklch(0.55 0.015 80);')}\n:root.dark {${DARK_DECLS}}`, false],
];

let bad = 0;
for (const [name, css, shouldPass] of cases) {
  const file = join(dir, name);
  writeFileSync(file, css);
  let passed = true;
  try {
    execFileSync('node', ['scripts/audit.mjs', '--palette', file, '--src', join(dir, 'src')], { stdio: 'pipe' });
  } catch {
    passed = false;
  }
  const ok = passed === shouldPass;
  console.log(`${ok ? '✓' : '✗'} ${name}: audit ${passed ? 'passed' : 'failed'} (expected ${shouldPass ? 'pass' : 'fail'})`);
  if (!ok) bad++;
}

process.exit(bad ? 1 : 0);
