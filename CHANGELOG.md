# Changelog

All notable changes to `remarque-tokens` are documented here. Token value
changes always state the design rationale — downstream sites pin against
these entries when syncing.

## 0.13.0 — 2026-07-23

Syntax-highlighting palette — 9 `--color-syntax-*` slots, ANSI-derived, golden-gated (closes #53; consensus-ratified 3-0 with a binding taxonomy design record, 2026-07-23).

### Added
- **`--color-syntax-keyword/string/constant/comment/function/type/punctuation/variable/link`** —
  9 new palette-tier slots in `tokens-palette.css`, hand-authored in both
  themes, quiet/low-chroma (chroma capped at 0.14, the same ceiling as
  `--color-accent`). Every slot is ≥ 4.5:1 against `--color-code-bg`
  (not `--color-bg`) in both themes — a new dimension the audit didn't
  cover before this release.
- **`scripts/audit.mjs`** — 9 new `CHECKS` pairings (each syntax slot vs.
  `color-code-bg`, 4.5:1, both themes). `scripts/test-audit.mjs`'s
  fixture palettes carry the 9 slots and a new must-fail case proves
  they're actually wired into `CHECKS`, not just parsed.
- **`scripts/theme.mjs` (`remarque-theme`)** — derives all 9 slots from a
  source theme's 16 ANSI colors (`keyword`←blue, `string`←green,
  `constant`←yellow, `function`←purple, `type`←cyan, `comment`←`brightBlack`
  in dark themes / a solved muted neutral in light themes,
  `punctuation`←a derived neutral, `variable`←fg-adjacent,
  `link`←the derived accent, aliased when it clears 4.5:1 on `code-bg`),
  same keep-if-passing-else-solve pattern and in-gamut chroma clamping as
  every other slot. `scripts/test-theme.mjs`'s 61-pair corpus (every
  counterpart-paired theme in the installed `oklch-terminal-themes`
  dataset) now runs the extended audit — 61/61 pass.
- **`scripts/palette-golden.mjs`** — extends the ΔE2000 ≤ 2.0 golden gate
  to the 9 syntax slots (now 24 `--color-*` tokens × 2 themes). The
  hand-authored defaults are the cleaned round-number serialization of
  values derived from `remarque-light`/`remarque-dark`'s ANSI colors,
  same identity/serialization contract as the rest of the default
  palette (#76).
- **REMARQUE.md "Syntax Highlighting"** — the slot table with Shiki
  `createCssVariablesTheme` and Prism class mappings, the exact Astro
  wiring snippet (pass the theme *object*, never the `'css-variables'`
  string — Astro renames its prefix), the CSS variable bridge required
  to make that wiring actually render (Shiki's `variablePrefix` prepends
  rather than renames its internal `token-*` names), a full Prism CSS
  mapping block, the three documented divergences (`type` ≡ `function`
  under Shiki, plain operators inherit foreground, diff markers out of
  scope), and the comment-contrast policy (4.5:1 held; GitHub
  light/dark-default and VS Code Dark+ all clear it).
- **Demo site (`site/`)** — wired `astro.config.mjs`'s `markdown.shikiConfig`
  and the Type Specimen page's new "Syntax Highlighting" section with
  the `createCssVariablesTheme` recipe and its CSS bridge
  (`site/src/styles/globals.css`), so at least one built page exercises
  every slot in both themes. `shiki` added as an explicit `site`
  devDependency (Astro already carries it transitively; pinned
  explicitly so the resolution is intentional, not an accident of
  hoisting). Playwright baselines updated for the 4 `specimen-*`
  screenshots (the only page with a highlighted code block); the other
  16 baselines are unchanged.

## 0.12.0 — 2026-07-23

TypeScript types and a README "Used By" section (closes #34, closes #35).

### Added
- **`tokens.d.ts`** — generated from `tokens.json` by `scripts/tokens-json.mjs`
  (regenerates in the same run as `tokens.json`; `--check` verifies both are
  fresh, wired into the same `deploy.yml` CI step). Ships literal-union types
  for every token name (`RemarqueCoreToken`, `RemarquePaletteToken`,
  `RemarqueToken`), a `RemarqueCssVar` template-literal type
  (`` `--${RemarqueToken}` ``), structural interfaces matching tokens.json's
  actual shape (`RemarqueTokensFile`, `RemarqueCoreTokenEntry`,
  `RemarquePaletteTokenEntry`), a `RemarqueTokenValues` interface with the
  live value of every token as a literal type, and an ambient
  `declare module 'remarque-tokens/tokens.json'` so
  `import tokens from 'remarque-tokens/tokens.json'` is precisely typed
  without depending on the consumer's `resolveJsonModule`. This package has
  no JS entry point — the types exist for editors/TS consumers who author
  Remarque token names or read `tokens.json` programmatically.
  `package.json` wires `types`, an `./tokens.d.ts` export, and a `types`
  condition on the existing `./tokens.json` export; `scripts/test-types.mjs`
  gates token-name coverage, the exported type surface, and the
  `package.json` wiring (string assertions, no `typescript` dependency
  added).
- **README "Used By" section** — the demo site, `williamzujkowski.github.io`
  (core-tier npm consumer), `tsundoku` (full-palette npm consumer, custom
  accent hue), and `remarque-starter` (template repo), one line each on how
  they consume the package.

## 0.11.0 — 2026-07-23

Palette golden gate: the default palette is now bound, by CI, to the
upstream `remarque-light`/`remarque-dark` themes (Phase 3 of the
color-provider integration, closes #76; consensus-ratified 3-0,
2026-07-23).

### Changed
- **`remarque-theme`: lightness is now KEEP-IF-PASSING, not always
  solved.** For `fg`, `accent`, `accent-hover`, and (in dark)
  `selection-fg`/`code-fg`, the bridge now keeps the theme's own
  authored lightness when it already clears the slot's contrast target,
  and only solves (binary search) when it doesn't. Previously every one
  of these slots was solved unconditionally — e.g. `fg` always landed
  exactly on the 10:1 threshold, flattening a well-designed theme's own
  ~13:1+ contrast down to the floor. The `fg` target itself also drops
  from 10:1 to 7:1 (the actual AAA line this slot exists to clear) when
  a solve is needed at all. **This changes derived output for every
  existing theme pairing** — most of the 61-pair corpus shifts at least
  one slot (see the PR for the full before/after) — hence the minor
  bump rather than a patch. Every pair still passes `remarque-audit`;
  the corpus property test (`test-theme.mjs`) stays green.
- **`fg-muted` and `border-bold` gain contrast headroom over their solved
  minimums** (−0.01 L and −0.02 L further from the background,
  respectively; mirrored in dark). Slots that exist to clear a legal line
  shouldn't sit exactly on it: borders at 3.0:1 are fragile against
  antialiasing, AAA text at 7.0:1 has no margin for rendering variance.
  This encodes the same headroom the hand-authored default has always
  carried (border-bold at 3.39:1, fg-muted at 7.55:1) into the
  derivation itself — it's what reconciled the golden gate's last two
  outliers without loosening the ΔE threshold.
- All other slots (`muted`, the bg ladder, `selection-bg`,
  `accent-subtle`) are unaffected — solved/derived unconditionally, same
  as before.
- **Accent selection now prefers the dataset's `accent` field** (dataset
  0.3.0+, upstream #133) — the same cursor-else-most-chromatic-ANSI
  heuristic, computed upstream where it can be curated per theme. The
  local heuristic remains as fallback for older datasets. Dev pin bumped
  `0.2.0` → `0.3.0`, whose native themes are OKLCH-authored (upstream
  #132): the Remarque themes now carry the design palette's exact
  values, which is what lets the golden gate below hold at ΔE ≤ 2.0
  with most tokens exactly 0.

### Added
- **`scripts/palette-golden.mjs`** (new CI gate, wired into
  `deploy.yml` right after the `remarque-theme` corpus test): derives
  the reference palette from the pinned `remarque-light`/`remarque-dark`
  themes and compares every `--color-*` token in both themes against
  the hand-authored `tokens-palette.css`, resolving `var()` chains,
  via CIEDE2000 (`culori`'s `differenceCiede2000` — not hand-rolled ΔE
  math). Asserts ΔE2000 ≤ 2.0 per token and an exact `weight-display`
  match; the full per-token table prints unconditionally (not just on
  failure) so drift stays visible before it reaches the threshold. A
  breach means the upstream themes and the hand file have diverged —
  reconcile one against the other, the gate does not loosen.
- **Site mirror check**, same script: asserts every `--color-*` value in
  `site/src/styles/globals.css`'s `[data-theme="light"]` block is
  string-identical (whitespace-normalized) to `tokens-palette.css`'s
  `:root` light value — the known drift trap called out in #76.
- `culori` added as a devDependency (already present transitively via
  `@williamzujkowski/oklch-terminal-themes`; now pinned directly since
  `palette-golden.mjs` imports it).
- REMARQUE.md "Color Providers": documents the identity/serialization
  contract — the upstream themes are the source of truth for the
  default palette's identity, `tokens-palette.css` is its human-authored
  serialization, and the golden gate is what keeps them from drifting
  apart. AGENT_RULES.md: palette color changes must keep the golden
  gate green; changing a default color means changing the upstream
  themes first (or in lockstep), not hand-editing the CSS alone.

## 0.10.0 — 2026-07-23

Color-provider Phase 2 groundwork: the upstream dataset now pairs its own
themes, so the bridge no longer needs to be told what goes with what.

### Changed
- **`remarque-theme`: `--dark` is now optional.** Dataset 0.2.0 of
  `@williamzujkowski/oklch-terminal-themes` ships a `counterpart` field
  (canonical light↔dark pairing, curated for ambiguous families —
  upstream #128); when the light theme declares one, the bridge uses it.
  A counterpart slug is validated exactly like a user-supplied `--dark`
  (index membership before any path resolution). Lights without a
  counterpart still require `--dark`; nothing is guessed from names.
- **Corpus test now enumerates pairs from the `counterpart` field**
  instead of the name-stem heuristic it shipped with — the dataset is
  authoritative; the heuristic is gone.
- Dev-pinned dataset bumped `0.1.0` → `0.2.0` (485 → 547 themes; the
  corpus now includes deriving Remarque's palette from its own upstreamed
  `remarque-light`/`remarque-dark` terminal themes, upstream #127).
  `peerDependencies` widened to `>=0.1.0 <0.3.0`.

## 0.9.0 — 2026-07-22

Color-provider bridge release (consensus-ratified 7-0, higher_order panel;
closes #75 — Phase 1 of the color-provider integration; Phase 2/3 tracked
in #76).

### Added
- **`remarque-theme` bin** (#75): `npx remarque-theme <light-slug> --dark
  <dark-slug> [-o out.css]` derives a full 15-slot palette-tier override
  from an `@williamzujkowski/oklch-terminal-themes` light+dark pair.
  Terminal themes carry only `background/foreground/cursor/selection` +
  16 ANSI slots — most of Remarque's semantic slots don't map directly,
  and most themes fail the AAA `fg-muted` 7:1 line as authored. The bridge
  derives instead: hue + chroma come from the theme, lightness is solved
  per slot by binary search against the exact Enforcement Checklist
  targets (in-gamut chroma clamping inside the solver, round-then-verify
  to avoid float rounding pushing a borderline value back out of gamut).
  Output passes `remarque-audit` **by construction** — the script
  self-verifies the same contrast + gamut checks in-process before it
  will emit anything.
- **Security hardening** (#75, panel security review): both slugs are
  validated against the package's own `index.json` *before* any path is
  built from them (the actual guard against path traversal, not the slug
  regex, which is defense-in-depth); every OKLCH triplet read from theme
  JSON is validated as finite numbers before use; CSS is never built by
  string-interpolating raw JSON — every emitted number has passed through
  our own rounding + validation. Light/dark polarity (`isDark`) is
  enforced against the requested slugs.
- **`scripts/test-theme.mjs`** (#75): a corpus property test enumerating
  every light+dark pair in the installed `oklch-terminal-themes` package
  by name-stem (47 pairs at the pinned 0.1.0 dataset) — every pair must
  derive AND pass the real `audit.mjs`, not a sample. Also covers unknown
  slugs, polarity mismatches, traversal-looking slugs, and that the
  output declares only palette-tier custom properties. Wired into CI
  alongside `test-audit.mjs`/`test-drift.mjs`.
- **`@williamzujkowski/oklch-terminal-themes`** pinned exact at `0.1.0` in
  `devDependencies`, and listed as an optional `^0.1.0` peerDependency —
  consumers who want `remarque-theme` install it themselves; it is never
  required to use the rest of the package.
- REMARQUE.md: new "Color Providers" section positioning the palette tier
  as theme-suppliable, with `oklch-terminal-themes` as the reference
  provider and the pairing contract stated explicitly (`--dark` is
  required; upstream pairing metadata tracked in
  `oklch-terminal-themes#128`). AGENT_RULES.md: a rule against hand-editing
  a generated palette — regenerate it instead.

No core-tier token values changed in this release. `tokens-palette.css`
(the shipped default palette) is also unchanged — `remarque-theme` is an
opt-in alternate source for the palette tier, not a replacement for it.

## 0.8.0 — 2026-07-21

Archetype-vocabulary and AI-agent-packaging release (design review; closes
#55, closes #57).

### Added
- **Three new page archetypes** (#55): Reference/Docs (persistent nav
  rail, breadcrumb kicker, prev/next footer — reuses Essay's three-column
  shape), Changelog (mono version/date headline, grouped Added/Changed/
  Fixed lists — built from Notebook's entry structure), and Gallery
  (content-wide cover grids, covers exempt from the reading-width cap,
  border-only hover — formalized from tsundoku's documented reference
  implementation, cited directly in REMARQUE.md). Seven archetypes total;
  agents must not invent an eighth.
- **Plate** (#55): a screenshot-heavy-page subsection of Image Treatment —
  numbered mono captions, a narrow 2-up exception for terminal captures.
- **CLI-tool landing guidance** (#55): a scoped, rationale-argued exception
  to Landing's no-CTA rule for a single mono install command block.
- **Dataviz Tokens** (#55): chart grid/axis/categorical-ramp mapped onto
  existing tokens and required to pass the audit — citing tsundoku's
  orthogonal category-color system as precedent and naming the one gap
  (never run through `remarque-audit`'s `CHECKS` array) this guidance
  closes.
- **`remarque-tokens/agent-rules` and `remarque-tokens/spec` exports**
  (#57): both files were already in `files`; this ships them as named
  subpaths so a consumer can `require.resolve('remarque-tokens/agent-rules')`
  instead of hardcoding a `node_modules` path.
- **`.claude/skills/remarque/SKILL.md`** (#57): a Claude Code skill
  triggering on "remarque" / "design system" / new-page work. Loads
  `AGENT_RULES.md` + `REMARQUE.md` + `tokens.json`, states the token-tier
  rules, the audit command, and Pitfalls #6/#7 (string-form `@import`;
  unlayered token import under Tailwind v4) inline — both pass a green
  build while silently breaking, so they're worth surfacing without a
  file round-trip.
- **`/tokens.json` on the demo site** (#57): `site/scripts/copy-tokens-json.mjs`
  runs as a prebuild step (`npm run build` in `site/`), copying the
  installed package's `tokens.json` into `public/` so it ships at
  `https://williamzujkowski.github.io/remarque/tokens.json` — a remote
  agent can fetch current token values instead of trusting training data.
  The copy is generated, not a source file (`site/public/tokens.json` is
  gitignored).
- Root README's "For AI Agents" section documents all three packaging
  additions above.

No core-tier token values changed in this release.

## 0.7.0 — 2026-07-21

Typographic-completeness release (design review, #50/#51/#54): the
prose element vocabulary, the editorial microtypography layer, and a
print stylesheet — three gaps the review found between what Remarque
claims to be ("rooted in book typography") and what it shipped.

### Added
- **Prose vocabulary completion** (#50): `.remarque-prose` now styles
  every remaining Markdown element — table/th/td/caption (+
  `.scroll-wrap` overflow container, mono th with a 2px bottom rule,
  1px row rules, no zebra, `.num` opt-in for tabular-lining numeric
  cells), dl/dt/dd (serif-italic term over a muted description, the
  "specimen list" pattern), h4–h6 (a descent through the three font
  slots), kbd (mono, 1px border), mark (`--color-accent-subtle`'s first
  sanctioned use), abbr[title] (dotted underline), sup/sub (footnote-
  marker-safe sizing), and details/summary (quiet mono triangle
  marker). No Markdown element renders unstyled after this release.
- **Editorial microtypography** (#51): the numerals policy
  (`--text-meta` → tabular-nums lining-nums; `.remarque-prose` →
  oldstyle-nums proportional-nums — REMARQUE.md:179 mandated this but
  no CSS ever implemented it); `.text-label` (true small caps via
  `font-variant-caps`, replacing `text-transform: uppercase`);
  `.remarque-prose--dropcap` (opt-in Essay first-paragraph drop cap);
  `.pullquote` (display italic, hairline rules, distinct from
  blockquote); wrapping/optical defaults (`text-wrap: balance` on
  headings, `text-wrap: pretty` + `hanging-punctuation` on prose,
  `font-synthesis: none`, `font-optical-sizing: auto`). New "Editorial
  Microtypography" spec section in REMARQUE.md.
- **`remarque-tokens/print.css`** (#54): a print layer scoped entirely
  inside `@page`/`@media print` — forces the light palette with true
  black-on-white (ink economy), hides nav/footer/TOC/theme-toggle/skip-
  link, expands content to full page width at 2cm margins, sets body
  to 11pt, appends `(url)` after external links, and applies
  orphans/widows/break-inside discipline to figures/tables/pre. Own
  subpath — not included by the `tokens.css` aggregator; import
  explicitly.
- **Drift-detection CI** (#47/#48, consensus-armed now that 2+ sites
  consume the package — williamzujkowski.github.io and tsundoku both pull
  `remarque-tokens` from npm): `scripts/drift-check.mjs` (shipped in the
  package; `files` + a `remarque-drift` bin entry) compares a consumer's
  stylesheet against the INSTALLED package's `tokens.json`. Reuses
  `scripts/lib/css-tokens.mjs` rather than a third CSS parser.
  - CORE-tier token redefined with a different value → **FAIL** (exit 1),
    unless the consumer's `DESIGN-DEVIATIONS.md` or `DESIGN-NOTES.md`
    names the token — then **WARN** with a pointer to that doc.
  - PALETTE-tier divergence → **INFO** (sanctioned personalization,
    listed, never blocking).
  - CORE-tier token consumed only via `var()`, never redeclared → no-op
    (it resolves from the package import).
  - Also prints the installed `remarque-tokens` version.
  - `.github/workflows/token-drift.yml`: reusable `workflow_call` wrapper
    consumers can call cross-repo (`css-file`, `package-dir` inputs).
  - `scripts/test-drift.mjs`: fixture tests for the classification rules
    (9 cases), wired into `deploy.yml` alongside `test-audit.mjs`.

### Changed
- `scripts/audit.mjs`'s token-file classification now recognizes
  `print.css` (it carries literal `oklch()` values for the forced
  print palette, same as a palette file).
- Demo site (`site/`): specimen page exercises the new table/dl/kbd/
  mark/abbr/sup-sub/details vocabulary; the five faux-uppercase eyebrow
  labels (`index.astro` x3, `tokens.astro`, `projects/remarque.astro`)
  now use `.text-label`; `against-decoration.astro` demonstrates the
  opt-in drop cap (`<Prose dropcap>`) and a `.pullquote`.

No core-tier token values changed in this release.

## 0.6.1 — 2026-07-21

### Fixed
Three audit/parser bugs from real-world adoption (#67, found by tsundoku):
- Body-less at-statements (`@import`, `@charset`) preceding a block no
  longer pollute its prelude and misclassify it as an at-rule — palette
  files may begin with imports.
- Selector classification accepts qualified root forms (`html:root`,
  `html[data-theme="dark"]`, `body.dark`, …) instead of exact strings.
- `--src` scans now strip HTML `<!-- -->` comments (line-numbers
  preserved) like CSS comments, ending issue-number false positives in
  .astro/.svelte markup.

Two new convention fixtures (leading-import, qualified-selectors) lock
the fixes in CI. Consumers can drop their documented workarounds.

## 0.6.0 — 2026-07-20

### Added
- **`--weight-display`** (palette tier, theme-conditional): display faces
  render at 400 in light mode and 500 in dark — light-on-dark text is
  optically thinner (halation), and high-contrast serif hairlines were
  disappearing at display sizes on dark backgrounds (#59).
  `.text-display`/`.text-title` consume it with a 400 fallback, so
  palettes that don't define it are unaffected.
- **The remarque mark** (`.remarque-endmark` in prose.css): the system's
  namesake made visible — a small muted fleuron closing every essay.
  One per essay, aria-hidden, deliberately outside the latin subsets so
  it falls to the serif fallback stack.

## 0.5.1 — 2026-07-20

Two `remarque-audit` fixes found by the flagship site's adoption (its
first real-world run):

### Fixed
- The file passed via `--palette` now always counts as a token file for
  the oklch-literal scan — previously a consumer palette named
  `global.css` produced ~200 false positives against its own token
  declarations. `theme-deck.css`-style generated palette files are also
  allowlisted.
- The `--src` scans strip comments (line numbers preserved) before
  matching, so prose like `(issue #324)` in a comment no longer trips
  the hex-color regex.

No token values changed.

## 0.5.0 — 2026-07-20

Theme-convention unification (epic #47 item 4; ratified 3-0 by consensus
panel with conditions, all implemented).

### Added
- **Dual dark selector**: the palette's manual-toggle block is now
  `[data-theme="dark"], :root.dark` — `[data-theme]` stays canonical for
  new sites; `:root.dark` is a compatibility bridge for class-keyed
  consumers (sunset target: 1.0). Specificity asymmetry documented.
- **`remarque-audit` parses both conventions natively** (plus
  `html.dark`/`.dark`), so class-keyed sites can adopt the audit with no
  flags. Fixture tests for all three conventions + a must-fail case run
  in CI.
- `exports` now includes `./package.json` (standard tooling expects
  `require('remarque-tokens/package.json')`; previously blocked).

### Fixed
- Parser bug: light-theme extraction matched any selector *containing*
  `:root`, so a `:root.dark` block would have leaked dark values into
  the light-theme audit and could mask light-theme contrast failures.
  Selector matching is now exact per comma-separated part.

No token values changed in this release.

## 0.4.0 — 2026-07-20

### Added
- **`remarque-tokens/prose`** subpath: `.remarque-prose` split out of
  `tokens-core.css` into `prose.css`, so consumers with their own prose
  system (e.g. the reference consumer's `.prose`) can import the core
  structural tokens without it.

### Changed
- **Breaking for `/core` importers:** `remarque-tokens/core` no longer
  includes `.remarque-prose` — import `remarque-tokens/prose` alongside
  it, or use the aggregator (`remarque-tokens`), which now includes all
  three files and is unchanged for consumers.
- Demo pages exercise the Tailwind v4 adapter utilities directly
  (`pt-remarque-10`, `rounded-sm`) instead of arbitrary-value escapes —
  same computed styles, real coverage of the theme.css surface.
- Internals: the brace-aware CSS token parser previously duplicated in
  `audit.mjs` and `tokens-json.mjs` now lives once in
  `scripts/lib/css-tokens.mjs` (shipped with the package for the bin).

No token values changed in this release.

## 0.3.0 — 2026-07-20

### Added
- **`remarque-tokens/theme.css`** (#48): Tailwind v4 adapter using
  `@theme inline` — utilities (`font-display`, `bg-surface`,
  `max-w-reading`, `mt-remarque-9`, …) reference the runtime custom
  properties directly, so palette switches (light/dark/theme-deck) flow
  through utilities with zero value duplication. Import order:
  `tailwindcss` → `remarque-tokens` → `remarque-tokens/theme.css`.
- **`tokens.json`** (#48): machine-readable token inventory (W3C
  design-tokens flavored, core/palette tiers, light+dark values),
  GENERATED from the CSS by `scripts/tokens-json.mjs` — the CSS remains
  the single source of truth; CI fails if the JSON goes stale.

### Changed
- The reference site now consumes the package itself (`file:..` link)
  instead of maintaining file copies — the demo build is the package's
  integration test, and the copy-sync burden is gone.

No token values changed in this release.

## 0.2.0 — 2026-07-20

First published release. Everything below is relative to the unpublished
`0.1.0` files that early adopters copied by hand.

### Added
- **Two-tier token architecture** (#47): `tokens-core.css` (immutable
  identity — type scale, spacing, widths, radius, motion, prose
  machinery) and `tokens-palette.css` (sanctioned personalization —
  font slots, colors, accent, `--content-reading` measure). `tokens.css`
  remains a backwards-compatible aggregator. Subpath exports:
  `remarque-tokens/core`, `remarque-tokens/palette`.
- **`remarque-audit`** CLI (#28): enforces the spec's checklist —
  WCAG 2.x contrast (OKLCH → sRGB → relative luminance), sRGB gamut,
  13px font floor, no hardcoded colors. `npx remarque-audit --palette
  <file> --src <dir>`.
- **`fonts.css` + `fonts/`** (#40): self-hosted latin woff2 subsets for
  all three slots, including true Inter italic. The Google Fonts CDN
  `@import` is gone.
- `prefers-reduced-motion` support (#45): the motion duration tokens
  zero out under reduced motion.
- Spec sections: Token Tiers, Font Slots with approved pairings,
  Measure Compensation table, accent-hue derivation recipe.

### Changed
- **Contrast fixes** (#42), all computed and audit-enforced:
  - light `--color-fg-muted` 0.45 → **0.43** L (7.55:1, meets the spec's own AAA line)
  - light `--color-muted` 0.55 → **0.54** L; dark 0.58 → **0.60** L (≥4.5:1 on bg *and* surface)
  - `--color-border-bold` light 0.78 → **0.62** L, dark 0.35 → **0.50** L (≥3:1, WCAG 1.4.11)
  - `--color-border` documented **decorative-only** (below 3:1 by design;
    functional boundaries use `border-bold`)
- **Gamut fixes:** light `--color-accent-hover` chroma 0.14 → **0.11**,
  `--color-accent-subtle` 0.03 → **0.02** — previous values were outside
  sRGB and browser-clipped.
- `tailwind.config.js` (#41): spacing namespaced as `remarque-N`
  (Tailwind's default numeric scale no longer overridden — `mt-12` is
  3rem again), `darkMode` keyed to `[data-theme="dark"]`, dead
  typography-plugin block removed. Tailwind v3 only; v4 projects write
  an `@theme` block.

### Removed
- `--weight-light`, `--space-px`, `--space-0` (defined but never
  consumed anywhere).

### Known limitations
- Import the token files with **string-form** `@import './tokens.css'`
  only — Tailwind v4 / Lightning CSS silently drops `@import url(...)`
  for local files (AGENT_RULES.md Pitfall #6).
- No Tailwind v4 `@theme` file is shipped yet (#48).
