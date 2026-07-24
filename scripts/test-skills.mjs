#!/usr/bin/env node
/*
 * Fixture/validation tests for the two Claude Code skills this package
 * ships and packages (`.claude/skills/remarque`, `.claude/skills/
 * remarque-adopt`) — the "enforce, don't instruct" gate applied to the
 * skills themselves, not just the CSS they document.
 *
 * Checks, per skill:
 *   1. Frontmatter parses, and `name`/`description` are present and
 *      non-empty (readFrontmatter, scripts/lib/skills.mjs).
 *   2. Every CLI flag the skill invokes on a `remarque-audit`/
 *      `remarque-drift`/`remarque-theme`/`*.mjs` command line is a flag
 *      those scripts' own arg-parsing actually recognizes — grepped
 *      straight out of scripts/audit.mjs, scripts/drift-check.mjs,
 *      scripts/theme.mjs, not hand-maintained separately (so a renamed
 *      flag breaks this test instead of shipping a stale doc).
 *   3. Every package-relative file path the skill references (backticked
 *      `*.md`/`*.mjs`/`*.js`/`*.json`/`*.css` names, excluding
 *      consumer-side placeholders and node_modules/subpath-export forms)
 *      resolves to a real file in this repo.
 *   4. The packaged `skills/<name>/SKILL.md` copy is byte-identical to
 *      the canonical `.claude/skills/<name>/SKILL.md` (same freshness
 *      check as `scripts/build-skills.mjs --check`, re-asserted here so
 *      `node scripts/test-skills.mjs` alone is a complete skills gate).
 *
 * Run: node scripts/test-skills.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { SKILLS, readFrontmatter } from './lib/skills.mjs';

let bad = 0;
function expect(label, cond, detail = '') {
  const ok = !!cond;
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : ` — ${detail}`}`);
  if (!ok) bad++;
}

// The scripts a skill's command-line examples are checked against — the
// concatenated text of all three is searched for each candidate flag
// literal, so it doesn't matter which of the three tools a given flag
// belongs to.
const SCRIPT_SOURCES = ['scripts/audit.mjs', 'scripts/drift-check.mjs', 'scripts/theme.mjs']
  .map((p) => readFileSync(p, 'utf8'))
  .join('\n');

// Lines that plausibly show a command invocation — only these are
// scanned for `--flag` tokens, so prose mentioning CSS custom properties
// (`--color-bg`, `--content-reading`, ...) or placeholder headings
// (`--token-name`) never gets misread as a CLI flag.
const COMMAND_MARKERS = ['remarque-audit', 'remarque-drift', 'remarque-theme', 'audit.mjs', 'drift-check.mjs', 'theme.mjs'];

// Bare filenames that are real conventions but belong to a CONSUMER
// project, not to this package's own layout — referenced by name in the
// skills (DESIGN-DEVIATIONS.md / DESIGN-NOTES.md, the drift-check
// deviation-doc convention), never expected to resolve inside this repo.
const CONSUMER_ONLY_NAMES = new Set(['DESIGN-DEVIATIONS.md', 'DESIGN-NOTES.md']);

const PATH_RE = /^[\w./-]+\.(?:md|mjs|js|json|css)$/;

for (const { name, canonical, packaged } of SKILLS) {
  console.log(`\n${name} (${canonical})`);

  if (!existsSync(canonical)) {
    expect(`${canonical} exists`, false);
    continue;
  }
  const text = readFileSync(canonical, 'utf8');

  // 1. Frontmatter
  const fm = readFrontmatter(text);
  expect('frontmatter parses', !!fm);
  expect('frontmatter has a non-empty "name"', !!fm?.name);
  expect('frontmatter has a non-empty "description"', !!fm?.description && fm.description.length > 20, fm?.description);

  // 2. CLI flags referenced actually exist in the scripts' arg parsing
  const flagLines = text.split('\n').filter((line) => COMMAND_MARKERS.some((m) => line.includes(m)));
  const flags = new Set();
  for (const line of flagLines) {
    for (const m of line.matchAll(/--[a-z][a-z-]*/g)) flags.add(m[0]);
  }
  if (flags.size === 0) {
    console.log('  (no command-line flags referenced)');
  }
  for (const flag of flags) {
    expect(`flag \`${flag}\` (referenced alongside a command name) exists in scripts' arg parsing`, SCRIPT_SOURCES.includes(flag));
  }

  // 3. Referenced file paths resolve in the package layout
  const backticked = [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  const pathCandidates = new Set(
    backticked
      .map((s) => s.replace(/^\.\//, ''))
      .filter((s) => PATH_RE.test(s))
      .filter((s) => !s.startsWith('node_modules/'))
      .filter((s) => !s.startsWith('remarque-tokens/')) // npm subpath export form, not a literal repo path
      .filter((s) => !CONSUMER_ONLY_NAMES.has(s))
  );
  for (const p of pathCandidates) {
    expect(`referenced path \`${p}\` resolves in this repo`, existsSync(p));
  }

  // 4. Packaged copy freshness
  const packagedText = existsSync(packaged) ? readFileSync(packaged, 'utf8') : null;
  expect(`${packaged} exists and matches ${canonical} (run \`node scripts/build-skills.mjs\` if stale)`, packagedText === text);
}

console.log();
if (bad) {
  console.error(`test-skills FAILED — ${bad} check(s) did not pass`);
  process.exit(1);
}
console.log('test-skills passed ✓');
