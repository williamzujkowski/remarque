#!/usr/bin/env node
/*
 * remarque-deck — build a whole Palette Deck in one call (0.31).
 *
 * Each entry is a light/dark pair from @williamzujkowski/oklch-terminal-
 * themes. For every pair this runs remarque-theme (--scope <name>
 * --format light-dark), so each palette follows whatever color-scheme the
 * page sets, then runs remarque-audit on the result. One failing palette
 * fails the build: nothing unaudited ships.
 *
 * Outputs, in --out-dir:
 *   <name>.css   one scoped palette per entry ([data-palette="<name>"])
 *   deck.css     all of them in one file: 15 curated palettes are ~7 KB
 *                gzipped, so one cached stylesheet is the simple default
 *                (the per-palette files exist for sites that load on demand)
 *   deck.json    the manifest: name, label, source slugs, file, and
 *                light/dark swatches (bg, surface, fg, accent) for a picker
 *
 * usage:
 *   remarque-deck --curated --out-dir public/palettes
 *   remarque-deck catppuccin-latte gruvbox-light:gruvbox-dark=gruvbox --out-dir out
 *
 * --default <palette.css> also emits swatches for the site's OWN palette
 * ([data-palette-swatch="default"]), read from the file you'd pass to
 * remarque-audit --palette; without it, the package's default palette.
 *
 * An entry is <light>[:<dark>][=<name>]. <dark> defaults to the dataset's
 * counterpart; <name> defaults to the light slug. --curated adds the list
 * pinned in deck/curated.json (reviewed, versioned with remarque-tokens,
 * so a dataset update never silently changes a site's deck). Entries
 * given after --curated are appended to it.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractBlocks, declsOf, isLightRoot, isDarkBlock, resolveSide, darkOverridesOf } from './lib/css-tokens.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const USAGE = 'usage: remarque-deck [--curated] [<light>[:<dark>][=<name>] ...] --out-dir <dir> [--default <palette.css>] [--json]';

function die(msg) {
  console.error(`remarque-deck: ${msg}`);
  process.exit(1);
}

const argv = process.argv.slice(2);
let outDir, curated = false, json = false, defaultPalette, check = false;
const specs = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--out-dir') outDir = argv[++i];
  else if (a === '--curated') curated = true;
  else if (a === '--json') json = true;
  else if (a === '--check') check = true;
  else if (a === '--default') defaultPalette = argv[++i];
  else if (a === '-h' || a === '--help') { console.log(USAGE); process.exit(0); }
  else if (a.startsWith('-')) die(`unknown option ${a}\n${USAGE}`);
  else specs.push(a);
}
if (!outDir) die(USAGE);
// --check: build into a scratch dir and compare with --out-dir, the way
// tokens-json/build-registry --check gate their generated files.
const targetDir = outDir;
if (check) outDir = mkdtempSync(join(tmpdir(), 'remarque-deck-check-'));

const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
const SPEC_RE = new RegExp(`^(${SLUG})(?::(${SLUG}))?(?:=(${SLUG}))?$`);
const entries = [];
if (curated) {
  for (const e of JSON.parse(readFileSync(join(ROOT, 'deck', 'curated.json'), 'utf8')).palettes) entries.push({ ...e });
}
for (const s of specs) {
  const m = SPEC_RE.exec(s);
  if (!m) die(`bad entry "${s}": expected <light>[:<dark>][=<name>], lowercase slugs`);
  entries.push({ light: m[1], dark: m[2], name: m[3] || m[1], label: null });
}
if (!entries.length) die(`no palettes: pass --curated and/or entries\n${USAGE}`);
const seen = new Set();
for (const e of entries) {
  if (seen.has(e.name)) die(`duplicate palette name "${e.name}"`);
  seen.add(e.name);
}

mkdirSync(outDir, { recursive: true });
const emptySrc = join(outDir, '.remarque-deck-empty-src');
mkdirSync(emptySrc, { recursive: true });

const themeBin = join(HERE, 'theme.mjs');
const auditBin = join(HERE, 'audit.mjs');
const val = (css, token) => (css.match(new RegExp(`--${token}:\\s*([^;]+);`)) || [])[1];
// light-dark(a, b) -> [a, b]; a plain value is both sides.
function sides(v) {
  const m = v && /^light-dark\((oklch\([^)]*\)),\s*(oklch\([^)]*\))\)$/.exec(v.trim());
  return m ? [m[1], m[2]] : [v, v];
}

const manifest = { generatedBy: `remarque-deck (remarque-tokens ${VERSION})`, palettes: [] };
const combined = [];
let failed = 0;
for (const e of entries) {
  const file = join(outDir, `${e.name}.css`);
  const args = [themeBin, e.light, '--scope', e.name, '--format', 'light-dark', '-o', file];
  if (e.dark) args.splice(2, 0, '--dark', e.dark);
  try {
    execFileSync('node', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (err) {
    failed++;
    console.error(`✗ ${e.name}: remarque-theme failed: ${(err.stderr || '').toString().trim().split('\n').pop()}`);
    continue;
  }
  let report;
  try {
    report = JSON.parse(execFileSync('node', [auditBin, '--palette', file, '--src', emptySrc, '--json'], { encoding: 'utf8' }));
  } catch (err) {
    report = JSON.parse(err.stdout || '{"passed":false,"failures":["audit crashed"]}');
  }
  if (!report.passed) {
    failed++;
    console.error(`✗ ${e.name}: remarque-audit failed: ${report.failures.slice(0, 3).join('; ')}`);
    continue;
  }
  const css = readFileSync(file, 'utf8');
  const dark = e.dark || (css.match(/dark = "([^"]+)"/) || [])[1];
  const sw = (i) => Object.fromEntries(['bg', 'surface', 'fg', 'accent'].map((t) => [t, sides(val(css, `color-${t}`))[i]]));
  manifest.palettes.push({
    name: e.name,
    label: e.label || e.name,
    light: e.light,
    dark,
    css: `${e.name}.css`,
    warnings: report.warnings.length,
    swatches: { light: sw(0), dark: sw(1) },
  });
  // Swatches for a picker: the palette's OWN colors, scoped to its option
  // ([data-palette-swatch="<name>"]) so they don't repaint when another
  // palette is active, and light-dark() so they show the current mode.
  // Kept in the generated file, so consumer source never holds oklch()
  // literals (remarque-audit flags those outside token files).
  const swatchCss = `\n/* picker swatches for "${e.name}" (remarque-deck) */\n[data-palette-swatch="${e.name}"] {\n${['bg', 'surface', 'fg', 'accent']
    .map((t) => `  --swatch-${t}: ${val(css, `color-${t}`)};`).join('\n')}\n}\n`;
  writeFileSync(file, css + swatchCss);
  combined.push(css + swatchCss);
  if (!json && !check) console.error(`✓ ${e.name} (${e.light} / ${dark}): audit passed, ${report.warnings.length} coherence warning(s)`);
}
if (failed) die(`${failed} palette(s) failed; nothing written for them, deck.css and deck.json not written`);

// Swatches for the "no deck palette" option: the site's own palette.
{
  const file = defaultPalette || join(ROOT, 'tokens-palette.css');
  const blocks = extractBlocks(readFileSync(file, 'utf8'));
  const rawLight = declsOf(blocks, isLightRoot);
  const light = resolveSide(rawLight, 'light');
  const dark = { ...light, ...darkOverridesOf(rawLight, declsOf(blocks, isDarkBlock)) };
  const resolve = (decls, name, seen = new Set()) => {
    const v = decls[name];
    if (v === undefined || seen.has(name)) return null;
    seen.add(name);
    const ref = /^var\(\s*--([a-z0-9-]+)\s*\)$/.exec(v);
    return ref ? resolve(decls, ref[1], seen) : v;
  };
  const lines = ['bg', 'surface', 'fg', 'accent'].map((t) => {
    const l = resolve(light, `color-${t}`), d = resolve(dark, `color-${t}`);
    if (!l || !d) die(`--default ${file}: can't resolve --color-${t} in both themes`);
    return `  --swatch-${t}: ${l === d ? l : `light-dark(${l}, ${d})`};`;
  });
  combined.unshift(`/* picker swatches for the site's own palette (remarque-deck --default ${relative('.', file)}) */\n[data-palette-swatch="default"] {\n${lines.join('\n')}\n}\n`);
}

writeFileSync(join(outDir, 'deck.css'), combined.join('\n'));
writeFileSync(join(outDir, 'deck.json'), JSON.stringify(manifest, null, 2) + '\n');
rmSync(emptySrc, { recursive: true });
if (check) {
  const want = readdirSync(outDir).sort();
  const stale = want.filter((f) => !existsSync(join(targetDir, f)) || readFileSync(join(targetDir, f), 'utf8') !== readFileSync(join(outDir, f), 'utf8'));
  const extra = existsSync(targetDir) ? readdirSync(targetDir).filter((f) => /\.(css|json)$/.test(f) && f !== 'curated.json' && !want.includes(f)) : [];
  rmSync(outDir, { recursive: true });
  if (stale.length || extra.length) die(`${relative('.', targetDir)} is stale (${[...stale, ...extra.map((f) => `${f} (no longer generated)`)].join(', ')}) — run: node scripts/deck.mjs --curated --out-dir ${relative('.', targetDir)}`);
  console.error(`remarque-deck: ${relative('.', targetDir)} is fresh ✓ (${manifest.palettes.length} palettes)`);
  process.exit(0);
}
if (json) console.log(JSON.stringify(manifest, null, 2));
else console.error(`remarque-deck: ${manifest.palettes.length} palette(s) in ${relative('.', outDir) || '.'} (deck.css, deck.json)`);
