# Changelog

All notable changes to `remarque-tokens` are documented here. Token value
changes always state the design rationale — downstream sites pin against
these entries when syncing.

## 0.23.0 — 2026-07-23

Machine-readable markup-contract registry (closes #100) — the ratified program's flagship item. Funded on the panel's amended rationale: it mechanically prevents the markup-contract transcription bug class (the sidenote DOM-order/aria-label failure found in the flagship migration, #89), not on "category-defining" positioning.

### Added
- **`registry.json` + `registry/{essay,broadsheet,forms,palette-deck}.json`** — four items, shaped like shadcn/ui's `registry-item.json`/`registry.json` (`https://ui.shadcn.com/schema/registry-item.json`, `.../registry.json`), adopted where the shape fits and explicitly NOT a parallel invented schema. Per-item: `name`/`type`/`title`/`description`/`dependencies`/`cssVars`/`docs`/`files` kept from shadcn's vocabulary; `type` mints one honest value (`remarque:contract` — none of shadcn's `registry:lib/component/ui/hook/...` describe a CSS+HTML contract with no installable component); `cssVars` is repurposed from "values to merge" to "the flat list of `--custom-property` names this item's CSS reads via `var(...)`, mechanically grepped"; `docs` is repurposed from a markdown blob to a single HTTPS URL into REMARQUE.md. `registry.json` is a lightweight index (pointer + pinned version/hash per item), not shadcn's full-item embedding — full payloads live only in `registry/<name>.json`. Every field-level adaptation and omission (`tailwind`/`css`/`envVars`/`font`/`extends`/`style`/`iconLibrary`/`baseColor`/`theme`/`files[].target`/`meta` — all omitted, none apply) is documented inline in the two vendored schemas and in REMARQUE.md's new "The Registry" section.
- **Security (panel-mandated, blocking), all enforced by `scripts/test-registry.mjs`:** every item pins a `version` (the exact package release) and an `integrity` hash (`sha256-<base64>`, W3C Subresource Integrity's own shape, computed over `files` at build time and independently recomputed in the test gate — not just carried over); every `docs`/`homepage` URL is `https://`; no item contains executable content anywhere (`scripts/test-registry.mjs` asserts no file's `content`, across every item, contains the substring `<script`). **`deck.js`** — the Palette Deck's runtime module, the one JS asset this package ships — is deliberately EXCLUDED from the registry entirely rather than included-and-hashed: the panel's "no executable content... files are HTML/CSS data" condition reads as absolute, so the honest call is a zero-`<script>`-tag bar with no case-by-case exception. `registry/palette-deck.json` ships only the `data-theme`/`data-palette` HTML fragment, not the FOUC-restore `<script>` sample documented beside it in REMARQUE.md — consumers still get `deck.js` via the ordinary `remarque-tokens/deck` package import.
- **Single-sourcing.** Every item's CSS `content` is read verbatim from the real `.css` file at build time (`essay.css`/`broadsheet.css`/`forms.css`) — never a second hand-copied literal. Every item's `usage.html` is extracted from REMARQUE.md's own "Markup contract" fenced samples via a `<!-- registry-usage:<name> -->` marker comment (new `scripts/lib/registry-extract.mjs`, `extractUsageHtml`) — the spec prose stays the ONE hand-authored copy; the registry is a derived build artifact, the same relationship `tokens.json` already has to the CSS.
- **`scripts/build-registry.mjs`** (`--check` for CI freshness, mirroring `scripts/tokens-json.mjs`) generates `registry.json` + `registry/*.json` in one pass from the CSS + REMARQUE.md markers + `package.json`'s version.
- **`scripts/test-registry.mjs`** (the enforce-don't-instruct gate this issue is funded on) — schema validation (`ajv`, draft 2020-12, with negative fixtures proving the schemas actually reject malformed input) plus mechanical re-derivation of the exact contract lines #89 was about, parsed straight out of each generated `usage.html`: every essay `.remarque-sidenote-ref` carries `aria-label="Note N"` and refs/notes strictly alternate in DOM order; the essay TOC rail carries `aria-label`; every broadsheet `.remarque-entry-numeral` carries `data-entry-number`; every forms `<input id>` has a matching `<label for>` and every `aria-describedby` target id exists in the sample.
- **Vendored schemas** `registry-item.schema.json` + `registry.schema.json` (draft 2020-12, hand-authored/adapted from shadcn's — see "Added" above for the field-by-field rationale).
- **CI wiring** (`deploy.yml`): `registry.json`/`registry/*.json` freshness-gated alongside `tokens.json` (`node scripts/build-registry.mjs --check`); `scripts/test-registry.mjs` runs alongside the other fixture suites.
- **Served by the demo site** (`site/scripts/copy-tokens-json.mjs`, extended): `registry.json`, `registry/*.json`, and both schemas copy into `public/` alongside `tokens.json`, published at `/registry.json`, `/registry/<name>.json`, `/registry-item.schema.json`, `/registry.schema.json`.
- **npm packaging:** `package.json` `files`/`exports` extended — `remarque-tokens/registry.json`, `remarque-tokens/registry/*` (subpath pattern → `registry/*.json`), `remarque-tokens/registry-item.schema.json`, `remarque-tokens/registry.schema.json`.
- **Docs.** REMARQUE.md's new "The Registry" section (what it is, the shape adaptation, the security model, the single-sourcing mechanism, what it deliberately is NOT — no CLI installer, no archetype "starter-page" items this round — and the fetch URLs). AGENT_RULES.md's new "Prefer the Registry Over Transcribing Prose" section — agents building Remarque pages should fetch a registry item rather than re-typing markup from spec prose. README's "For AI Agents" section and Files table updated with the registry's live endpoints.
- **Scope note:** the mandatory four items (essay, broadsheet, forms, palette-deck) are the whole of this release — per-archetype "starter-page" items were floated as an IF-cheap extra and SKIPPED: archetype pages live as demo-specific Astro files, not as a reusable module with one canonical markup sample, so there was nothing to single-source without inventing a new "canonical" sample from scratch.
- Version-only regeneration of `tokens.json`/`tokens.d.ts` (no CSS/token changes this release).

### Fixed
- **`peerDependencies` range for `@williamzujkowski/oklch-terminal-themes` was stale and broke every real consumer install.** Set to `>=0.1.0 <0.3.0` back when the dataset was at 0.1.0 and never widened as it shipped 0.4.0 (issue #94's dataviz fields) and 0.5.0 (the current devDependency pin) — `npm install remarque-tokens @williamzujkowski/oklch-terminal-themes@0.5.0` failed with `ERESOLVE` for any consumer following the documented "Color Providers" instructions, with no `--legacy-peer-deps` escape hatch offered or implied anywhere in the docs. Invisible from inside this repo because `npm ci` here installs both packages directly as siblings (root devDependency + peerDependency), which never exercises npm's peer-resolution algorithm the way a consumer's plain `npm install` does. Widened to `>=0.1.0 <1.0.0` — the dataset's changes have been strictly additive since 0.1.0 and `remarque-theme`/`remarque-audit` runtime-validate every field they read (see e.g. the dataviz-fallback error path added in 0.22.0), so the honest ceiling is the dataset's own 1.0 breaking-change boundary, not a minor-by-minor cap that recreates this exact break on every upstream release.
- **New `scripts/test-pack.mjs`** — a real consumer smoke test closing the gap that let the above go unnoticed: `npm pack`s the actual tarball (not the repo checkout), installs it plus the pinned dataset devDependency version into a scratch project with plain `npm install` (deliberately no `--legacy-peer-deps` — the assertion IS that peer resolution succeeds), then runs `npx remarque-theme remarque-light -o out.css` and `npx remarque-audit --palette out.css --src . --json` from that install and asserts `passed: true`. Wired into `deploy.yml` after the other gates (needs registry network access, which the existing devDependency-install step already has).

Dataviz categorical tokens — bridge-derived, golden-gated (closes #94). The syntax-palette pattern's fourth application, closing the "Dataviz Tokens" section's long-standing "guidance, not a palette" gap now that the upstream dataset ships a per-theme `dataviz` block (`@williamzujkowski/oklch-terminal-themes` 0.5.0).

### Added
- **6 `--color-viz-1..6` palette-tier slots**, hand-authored in both themes from `remarque-light`/`remarque-dark`'s `dataviz.categorical` block, serialized as round numbers (identity/serialization contract, same as `--color-syntax-*`). 6 slots, not 8 — the dataset's own floor (516 of 633 corpus themes ship exactly 6). Every slot ≥ **3:1** against `--color-bg` in both themes — Carbon's mark-on-background line, not text's 4.5:1 (marks are read at a glance, not continuously like prose). Added to `tokens-palette.css`'s `:root`, `@media (prefers-color-scheme: dark)`, `[data-theme="dark"]`/`:root.dark`, and the demo's `[data-theme="light"]` mirror.
- **`remarque-theme` dataviz derivation.** Derives all 6 slots from the source theme's own `dataviz.categorical` array (first 6 entries, dataset order, per theme independently — order is **not** reconciled hue-for-hue across a light/dark pair; verified the upstream order itself differs between `remarque-light` and `remarque-dark`, consistent with this file's existing "dark mode is independently tuned, not inverted" stance). Same keep-if-passing-else-solve pattern as every other slot, chroma capped at 0.14. **Fallback:** an installed dataset older than 0.5.0 (still legal under the `>=0.1.0` peerDependencies floor) has no `dataviz` block — `remarque-theme` errors loudly naming the missing field and the upgrade path rather than synthesizing a guessed ramp from raw ANSI colors (the upstream categorical-selection algorithm is undocumented; guessing at it could silently diverge from a real 0.5.0+ dataset).
- **`remarque-theme --dataviz`** (optional, judgment-call item). Emits `--viz-sequential-N`/`--viz-diverging-N` custom properties from the dataset's `dataviz.sequential`/`.diverging` ramps — gamut-clamped but NOT contrast-solved (a sequential ramp's low end is designed to sit near `--color-bg`) and NOT audited/golden-gated like `--color-viz-1..6` (these are per-use ramps, not identity tokens). Purely additive: omitting the flag leaves the derived `--color-*` output byte-identical to before.
- **Audit extension** (`scripts/audit.mjs`, `scripts/theme.mjs` self-verify) — 6 new `CHECKS` pairings (`color-viz-1..6` vs `color-bg` at 3.0). `scripts/test-audit.mjs` fixtures updated with the 6 slots plus a must-fail case (`viz-slot-fails.css`) proving the pairings are actually wired in.
- **Golden gate** (`scripts/palette-golden.mjs`) extended to the 6 new slots — ΔE2000 = 0.000 in both themes (the hand-authored values are literal transcriptions of the dataset's own numbers, unlike the solved slots elsewhere in the palette).
- **REMARQUE.md "Dataviz Tokens"** rewritten: the 6 shipped tokens with light/dark values and ratios, the 3:1 mark-threshold rationale, a mandatory non-color-redundancy rule (shape/pattern/label — never color alone, per Carbon and tsundoku's precedent), and a documented recipe for sequential/diverging ramps (direct JSON consumption from the dataset, or `remarque-theme --dataviz`). New Enforcement Checklist line.
- **Demo** (`site/src/pages/tokens.astro`): a "Dataviz" section rendering all 6 swatches in both themes with contrast ratios and a shape-coded legend (circle/square/triangle) demonstrating the non-color-redundancy rule directly. Placed on `tokens.astro`, which carries zero visual-regression baselines — this ships with no new/changed screenshot baselines.
- **Repin**: `@williamzujkowski/oklch-terminal-themes` devDependency 0.4.0 → 0.5.0 (exact). Corpus test (`scripts/test-theme.mjs`) still 65/65 pairs passing — the dataset gained fields (`dataviz` on every theme), not themes, matching the repin pattern's usual shape.

## 0.21.0 — 2026-07-23

Forced-colors (Windows High Contrast Mode) + `prefers-contrast: more` support (closes #93) — the ratified program's highest-value accessibility item.

### Added
- **`@media (forced-colors: active)` audit and fixes** across `tokens-core.css`, `prose.css`, `essay.css`, `broadsheet.css`, `forms.css`, and the demo's `globals.css`/`tokens.astro`. Every color-bearing declaration was classified as fine-as-is (the overwhelming majority — `border-color` on a real, non-transparent border is forced to a visible system color regardless of the authored value, so `--color-border`'s documented sub-3:1 hairlines, prose table rules, sidenote/TOC borders, etc. already survive with zero code changes), affordance-loss (fixed), or must-survive custom painting (`forced-color-adjust: none`, justified). See REMARQUE.md's new "Forced Colors & Contrast Preferences" section for the full inventory.
  - **Broadsheet title-link hover/focus** (`broadsheet.css`): the underline-grow effect is a `background-image` gradient, which forced-colors mode forces to `none` — added a `text-decoration: underline` fallback under `@media (forced-colors: active)`.
  - **`.remarque-rule`** (`broadsheet.css`, masthead dateline divider): converted from a `background` fill on a bare `<span>` (at risk of being forced to `Canvas` and disappearing) to a real `border-top` — an unconditional fix, not media-gated, since a border is simply the correct way to author a hairline.
  - **Form validation states** (`forms.css`): error/success/warning were distinguished entirely by `border-color`/`color`, both forced under forced-colors — added `border-style`/`border-width` differentiation (double/dashed/solid) plus a small glyph (✕/⚠/✓) prefixed to the message line, scoped to `@media (forced-colors: active)`.
  - **Focus** (`tokens-core.css`): `:focus-visible` was already forced-colors-safe (`outline`, not `box-shadow` — `box-shadow` is unconditionally forced to `none`); added an explicit `outline-color: Highlight` under forced-colors so the ring keys to the same system color as the rest of the OS, and so the CI gate has something explicit to assert against.
  - **Demo chrome**: `.nav-link`/`.footer-link`/TOC-rail hover (color-only affordances) get the same `text-decoration: underline` forced-colors fallback; `tokens.astro`'s color-token reference swatches get `forced-color-adjust: none` (the one "must-survive custom painting" case — the swatch's entire purpose is showing the real color).
- **`prefers-contrast: more`** (`tokens-palette.css`). Bumps `--color-border-bold` (light 3.39:1 → 4.52:1, dark 3.23:1 → 4.53:1) and `--color-fg-muted` (light 7.55:1 → 10.11:1, dark 7.26:1 → 9.70:1) one step toward `--color-fg`, for users who want more contrast without forced-colors' system-color override. Lives in the palette tier (same mechanism as the existing `prefers-color-scheme: dark` override) — version-only change to `tokens.json`/`tokens.d.ts` since no new token names were introduced.
- **`scripts/lib/css-tokens.mjs` context-exactness fix.** `isDarkBlock`'s two recognition paths (the `prefers-color-scheme: dark` media convention and the `[data-theme="dark"]`/`:root.dark` selector convention) were previously matched by unguarded substring checks — a `[data-theme="dark"]` selector or a `prefers-color-scheme: dark` feature nested inside an unrelated or compounded media query (exactly the shape the new `prefers-contrast: more` block uses) would have been misread as an unconditional dark override, silently clobbering the real dark values in generated output (`tokens.json`/`tokens.d.ts`) and audit results. Both paths are now context-exact (top-level, or the plain non-compounded `@media (prefers-color-scheme: dark)` query only). Two regression fixtures added to `scripts/test-audit.mjs` (`nested-media-not-dark.css`, `compound-media-not-dark.css`) proving a nested/compounded dark-selector block no longer overrides the real one.
- **`site/tests/forced-colors.spec.ts`** — the issue's blocking CI condition. Computed-style assertions (no pixel diffing) under `page.emulateMedia({ forcedColors: 'active' })`: a nav link's keyboard focus renders a visible, non-zero outline; `.remarque-table` borders resolve to a non-transparent `border-color`; the essay module's TOC rail and (narrow-viewport) sidenote borders stay visible; a form's error/success states render `border-style` distinct from the default and from each other. Wired into the existing `visual-regression.yml` workflow (`npx playwright test` already runs the whole `site/tests/` directory). Three forced-colors screenshot baselines (landing/essay/components) added as a secondary, non-blocking supplement — forced-colors rendering is deterministic in headless Chromium.

## 0.20.0 — 2026-07-23

Machine-readable surface: `--json` for `remarque-audit`/`remarque-drift`, and a published JSON Schema for `tokens.json` (closes #98, closes #99).

### Added
- **`--json` on `remarque-audit`** (issue #98). Suppresses all human console output (both the progress lines and the error lines normally on stderr) and emits ONE JSON document to stdout instead — exit codes unchanged. Shape: `{ version, palette, src, passed, contrast: [{theme,fg,bg,label,required,actual,ok,error?}], gamut: [{theme,token,value,ok}], srcScans: {fontFloor,unverifiableFontSize,hardcodedColors,oklchLiteral}, failures: [] }`. `contrast`/`gamut` list every check performed (pass and fail); `srcScans`/`failures` are violation-only. Documented in `AGENT_RULES.md` ("Machine-Readable Output") — agents are the intended audience, parsing structure instead of scraping colored stdout.
- **`--json` on `remarque-drift`** (issue #98). Same suppression contract; emits `{ cssFile, packageDir, installedVersion, deviationDoc, passed, fail: [], warn: [], info: [], summary: {fail,warn,info} }` — one record per (token, theme) mismatch, mirroring the FAIL/WARN/INFO classification the human report already prints.
- **`tokens.schema.json`** (issue #99). JSON Schema (draft 2020-12) describing `tokens.json`'s actual shape, generated by `scripts/tokens-json.mjs` in the same pass as `tokens.json`/`tokens.d.ts`, same `--check` freshness gate. Token *names* are open (`patternProperties` on the kebab-case grammar); the `$value`/`$type`/light-dark VALUE shapes are fixed. Published as the `remarque-tokens/tokens.schema.json` export, shipped in `files`, and served by the demo site at `/tokens.schema.json` (alongside the existing `/tokens.json`) via an extended `site/scripts/copy-tokens-json.mjs` — shadcn's schema-URL precedent. `tokens.json` now carries a `"$schema"` pointer to that URL.
- **DTCG conformance note** (issue #99, ratified option ii). `tokens.json`'s `$extensions.remarque.dtcg` documents that the file is conformant in spirit with the Design Tokens Community Group format (`$value`/`$type` on every token) with two **deliberate** divergences — color values as `oklch()` CSS strings (not DTCG's structured color object) and per-token `light`/`dark` nesting (DTCG has no ratified multi-mode/resolver mechanism yet) — each with a named ratification trigger, so a future agent can't "fix" `tokens.json` toward an unratified target. Same argument restated for humans in REMARQUE.md's new "DTCG Conformance" section (under "Token Tiers").
- **Schema validation in CI** (`scripts/test-types.mjs`). Real JSON-Schema validation of `tokens.json` against `tokens.schema.json` via `ajv` (new devDependency, pinned to a version with zero known advisories; the `$data` option that the one applicable ajv CVE requires is never used) — plus three negative fixtures (unknown `$extensions` key, invalid `$type` enum value, missing required `dark` side) proving the schema actually rejects malformed input rather than accepting anything.
- **`--json` fixture coverage** (`scripts/test-audit.mjs`, `scripts/test-drift.mjs`). Parses the JSON output of a passing and a must-fail fixture for each tool; asserts the documented shape and that the must-fail fixture's offending pairing/token is actually present with `ok`/`passed: false`.

## 0.19.0 — 2026-07-23

Palette Deck module (closes #56).

### Added
- **`deck.js` — palette-deck module (issue #56, re-scoped by 2026-07-23
  consensus panel).** New own-subpath export (`remarque-tokens/deck`,
  `remarque-tokens/deck.js`) — a dependency-free ~60-line ESM file, NOT
  aggregated into `tokens.css` (it ships no CSS at all). Deliberately
  THIN: the original theme-deck graduation proposal (12 terminal
  palettes as `:root[data-theme-deck]` overrides) predates
  `remarque-theme`; the panel re-scoped it to cover only what that
  pipeline doesn't already provide — switching, persisting, and
  FOUC-safely restoring a choice among already-generated palettes.
  Generation, contrast solving, and hue/pairing remain entirely
  `remarque-theme`'s job.
  - `createDeck(names, opts?)` — registers a set of palette names,
    returns `{ names, current, apply, restore }`. `apply(name)` sets/
    clears `data-palette` on the root element and persists the choice to
    `localStorage` (default key `remarque-palette`); `apply(null)`
    reverts to the unscoped default. `restore()` re-applies a persisted
    choice without re-persisting it (for the post-paint sync step — the
    actual FOUC guard is a duplicated inline snippet, documented in
    REMARQUE.md, matching how the light/dark theme toggle's own `<head>`
    script already works). Unknown names throw rather than setting an
    unvalidated attribute value.
- **`--scope <name>` on `remarque-theme`.** Emits the derived palette
  under `[data-palette="<name>"]` / `[data-palette="<name>"][data-theme="dark"]`
  instead of `:root` / `[data-theme="dark"]`, so several generated
  palettes can coexist in one stylesheet. `<name>` is validated with the
  same slug grammar as `<light-slug>`/`--dark` before it is interpolated
  into the attribute selector (security review precedent from #75/#76 —
  it is the only control here, since a scope name has no upstream index
  to check against). Derivation and self-verification are unaffected by
  scoping — a scoped and unscoped run of the same pair emit
  byte-identical declarations, differing only in the wrapping selector
  (fixture-tested).
- **`remarque-audit` recognizes scoped palettes directly.**
  `scripts/lib/css-tokens.mjs`'s `isLightRoot` now treats a bare
  `[data-palette="name"]` block as that scope's light root (one more
  exact-match case, symmetric with the existing `[data-theme="light"]`
  special case) — `isDarkBlock` needed no change, since
  `[data-palette="name"][data-theme="dark"]` already matched its
  existing rule. A `--scope`'d file is auditable exactly like any other
  palette file; no "audit the unscoped version first" workaround is
  needed. See REMARQUE.md "Palette Deck" for the full audit story and
  why this was the smaller correct fix over a bespoke attribute-selector
  grammar.
- **Demo (`site/`):** a Palette Deck section on `/tokens` with a native
  `<select class="remarque-input">` switcher (gruvbox / rosé-pine,
  pinned slugs `gruvbox-light`/`gruvbox-dark` and
  `rose-pine-dawn`/`rose-pine`), generated at build time by
  `site/scripts/build-palette-deck.mjs` into `public/palettes/*.css`
  (gitignored, regenerated every build — same pattern as
  `public/tokens.json`). FOUC-safe restore snippet added to
  `BaseLayout.astro`'s `<head>`, alongside the existing theme-toggle
  script. VR baselines: `tokens.astro` only (new section on that page);
  every other page is untouched by this release.

## 0.18.0 — 2026-07-23

Form control primitives + reference components (closes #27, closes #30).

### Added
- **`forms.css` — form control primitives module (issue #27).** New own-subpath
  module (`remarque-tokens/forms`, `remarque-tokens/forms.css`), NOT aggregated
  into `tokens.css` — matches `essay.css`/`broadsheet.css`/`print.css`'s
  opt-in convention. Spec-native (built directly from the issue, not
  graduated from a downstream site — no prior flagship implementation to
  re-express).
  - `.remarque-field` (label + control + help/error message vertical stack),
    `.remarque-field-label` (meta voice, same declarations as `.text-label`),
    `.remarque-field-required`, `.remarque-field-message`.
  - `.remarque-input` — shared class across `<input>`/`<textarea>`/`<select>`:
    body-voice text, `--color-border-bold` boundary (functional, 3:1-checked),
    `--radius-sm` (tighter than the general 8px ceiling — form controls stay
    more precise-reading), ≥44px tall, `::placeholder` at `--color-muted`
    (a conscious AA choice, documented — placeholder is supplementary hint
    copy, never the field's only label).
  - `.remarque-checkbox` / `.remarque-radio` — `accent-color` only, no
    `appearance: none`, no hand-drawn replacement; native controls keep every
    platform accessibility behavior. Sized at `--space-5` (24px), wrapped in
    a `<label>` carrying the 44px touch target.
  - `.remarque-button` (+ `--primary` variant) — quiet by rule: bordered,
    transparent, body-voice text by default; `--primary` is the one
    sanctioned accent placement per viewport, still unfilled (accent
    text/border, hover washes in `--color-accent-subtle`, never a solid
    fill). Disabled state (native `:disabled`) uses `--color-disabled`.
  - Validation state wiring on the 0.17.0 state-color tokens:
    `.remarque-field[data-state="error"|"success"|"warning"]` recolors the
    input border and message text together; always pairs with a real
    `aria-invalid`/`aria-describedby` on the input (`data-state` is paint
    only). `.remarque-input:user-invalid`, guarded with
    `@supports selector(:user-invalid)`, is a zero-JS bonus layer.
  - `.remarque-table` / `.remarque-table-wrap` — a standalone-table
    re-scoping of `prose.css`'s table rules (mono `th`, 2px header rule, 1px
    row rules, `.num` tabular-lining columns) for data tables that shouldn't
    be wrapped in the full `.remarque-prose` container. Lives in `forms.css`
    rather than a fifth subpath — AGENT_RULES.md's build order already
    groups tables with buttons/cards as one supplementary-UI step.
  - REMARQUE.md "Forms" section — full markup contract, state-wiring rules,
    restraint rules restated (radius/touch-targets/no-fake-replacements/
    quiet-buttons/placeholder-contrast), standalone-tables note, and "when
    NOT to use" (Remarque is editorial-first — contact/search/newsletter
    moments, not app UIs). AGENT_RULES.md's File Structure Convention and
    Quality Checklist gain matching entries.
  - `scripts/audit.mjs`'s `--src .` invocation covers `forms.css` for free
    (font-floor + no-hardcoded-color scans — no new pairings needed, this
    module introduces no new color tokens).
- **Reference components (demo site, issue #30)** — `site/src/components/`:
  `Button.astro`, `Input.astro` (a `.remarque-field` wrapper — label/help/
  error props, wires `for`/`id`/`aria-describedby`/`aria-invalid`),
  `Table.astro` (`.remarque-table`, standalone). New demo page
  `site/pages/components` exercises every input state (default/focus/error/
  success/disabled), both button variants, and a sample table in both
  themes — added to `site/tests/helpers.ts`'s `PAGES` for visual-regression
  coverage (new baselines for this page only; no existing baseline changed)
  and linked from the site nav.

## 0.17.0 — 2026-07-23

Semantic state colors + z-index scale (closes #26, closes #29).

### Added
- **State colors (`tokens-palette.css`, PALETTE tier)** — four semantic slots for feedback
  moments (form validation, status banners, disabled controls), never decoration; the
  one-accent rule still governs everything else. Hand-authored from the house ANSI hue
  conventions, both themes, all three dark-mode conventions (`@media
  prefers-color-scheme: dark`, `[data-theme="dark"]`, `:root.dark`):
  - `--color-error` (hue 25, ANSI red) — light `oklch(0.52 0.12 25)` 5.44:1 bg / 5.28:1
    surface; dark `oklch(0.62 0.11 26)` 5.07:1 bg / 4.82:1 surface.
  - `--color-success` (hue 145, ANSI green) — light `oklch(0.51 0.12 145)` 5.08:1 bg /
    4.93:1 surface; dark `oklch(0.61 0.11 145)` 5.36:1 bg / 5.10:1 surface.
  - `--color-warning` (hue 85, ANSI yellow) — light `oklch(0.52 0.105 85)` 5.17:1 bg /
    5.02:1 surface; dark `oklch(0.62 0.11 85)` 5.29:1 bg / 5.03:1 surface. The hard case:
    yellow's low luminance-contrast means this slot solves noticeably darker in light
    mode than error/success, the same shape as `--color-syntax-constant`'s solve.
  - `--color-disabled` — aliased to `var(--color-muted)` in both themes: neutral
    hue-80 muted family, deliberately **not** ANSI-derived.
  - `-subtle` banner-background companions on the first three (`--color-error-subtle`/
    `--color-success-subtle`/`--color-warning-subtle`, modeled on `--color-accent-subtle`
    — near-bg lightness, state hue, low chroma) verified so `--color-fg` stays ≥4.5:1 on
    them (the pairing that matters for callout/banner body text). No `-subtle` for
    `--color-disabled` — a disabled control is quieter, not tinted.
  - Every state text color ≥4.5:1 against `--color-bg` **and** `--color-surface`, both
    themes; `scripts/audit.mjs` gains the 11 new pairings, `scripts/test-audit.mjs`'s
    fixtures cover all seven tokens plus a must-fail case (`state-color-fails.css`).
  - `scripts/theme.mjs` (`remarque-theme`) derives error/success/warning from a source
    theme's red/green/yellow ANSI slots — keep-if-passing lightness checked against the
    **stricter** of `--color-bg`/`--color-surface` at once (a new dual-target solver,
    `keepOrSolveDual`/`solveDual`), not just one target like every other slot. Disabled
    aliases the already-derived `--color-muted`. `-subtle` companions derive like
    `--color-accent-subtle` (fixed 0.95 / bg+0.06 starting lightness — not the theme's
    own solved bg lightness, which can exceed 0.95), nudged toward the extreme only if a
    pathological theme doesn't already clear 4.5:1 against `--color-fg`. Self-verify
    `CHECKS` mirrors `audit.mjs`'s new pairings exactly.
  - `scripts/palette-golden.mjs` golden-gates all seven new tokens for free (it already
    iterates whatever the bridge emits) — ΔE2000 ≤ 2.0 against `remarque-light`/
    `remarque-dark`'s ANSI derivation, same identity/serialization contract as the rest
    of the default palette. All new tokens land at ΔE ≤ 0.5 (see the PR description for
    the full per-token table).
  - REMARQUE.md "State Colors" — semantics, usage table, derivation note; Enforcement
    Checklist gains the state-color pairing line.
- **Z-index scale (`tokens-core.css`, CORE tier)** — stacking is structural, not
  personalization. A small ordinal scale, sparse gaps of 10: `--z-base` (0), `--z-sticky`
  (10), `--z-dropdown` (20), `--z-overlay` (30), `--z-modal` (40), `--z-toast` (50),
  `--z-skip-link` (60, tops everything). Wired into `essay.css`'s sticky TOC rail
  (`z-index: var(--z-sticky)`) and the demo site's skip-to-content link
  (`focus:z-[var(--z-skip-link)]`, replacing a hardcoded Tailwind `focus:z-50`).
  `theme.css`'s header comment documents the Tailwind v4 workaround — v4 has no
  `--z-index-*` theme namespace, so `z-*` utilities can't map to these directly; use
  arbitrary values (`z-[var(--z-modal)]`) instead, same pattern as the motion durations.
  REMARQUE.md "Stacking" — the scale, and the rule that consumer CSS must never author a
  bare `z-index` number. AGENT_RULES.md's Layout/Quality Checklist sections gain matching
  lines.

### Changed
- **`scripts/tokens-json.mjs`** — `typeOf()` now types `--z-*` tokens as `number`
  (unitless stacking-order integers), matching the existing `--leading-*` treatment,
  instead of falling through to the generic `string` type.

## 0.16.0 — 2026-07-23

Broadsheet pattern — masthead, lead article, numbered entry list, post-header kicker, graduated from the flagship (closes #36).

### Added
- **`broadsheet.css`** (new subpath: `remarque-tokens/broadsheet`, `remarque-tokens/broadsheet.css`) —
  optional editorial Landing/archive pattern, not aggregated into `tokens.css` or `prose.css`.
  Validated downstream on williamzujkowski.github.io (landing PR #213, archive/tag/post-header
  PR #214) before upstreaming. Adds four primitives:
  - `.remarque-masthead` — centered nameplate: mono small-caps kicker, oversized mixed
    roman + italic `--font-display` title, mono dateline with hairline-rule separators.
    **Fluid-type decision:** the flagship's `clamp(3.5rem, 9vw, 7.5rem)` title exceeds
    `--text-display` (tokens-core.css's largest rung, `clamp(2.75rem, 5.5vw, 5rem)`) — no
    existing token reaches it, so `.remarque-masthead` declares a file-scoped
    `--remarque-masthead-size` whose min/max bounds are arithmetic on existing core spacing
    tokens (`--space-7 + --space-2` = 3.5rem, `--space-10 - --space-2` = 7.5rem) rather than
    new literals or a new core token — both resolve to the exact flagship values already
    validated (contrast/gamut/font-floor audits + axe).
  - `.remarque-lead` — mono kicker, large `--font-display` title (reuses `--text-display`
    as-is — its range covers the flagship's closely enough that no exception was needed
    here), underline-grow hover (`--motion-normal`/`--motion-easing`, reduced-motion-safe
    for free via tokens-core.css's existing zeroing), italic lede with an italic drop cap
    (same 3.5em/`initial-letter` mechanics as `.remarque-prose--dropcap` — one drop-cap
    voice, not a second bespoke number).
  - `.remarque-entry-list` / `.remarque-entry` — numbered entries via `data-entry-number`
    + `attr()`, NOT `counter()` (counter-generated content doesn't reliably receive the
    OpenType oldstyle-figure treatment across Newsreader's weights — a graduation finding
    worth keeping). Numeral column sized in `ch` units (intrinsic to the glyphs) rather
    than an asserted rem literal. `<ul>`, not `<ol>` — the numeral is `aria-hidden` and
    decorative, an `<ol>` would double-announce the position. Collapses to one column via
    a container query at `40rem` (exactly `--space-10` x 5, matching the flagship's `640px`
    — container-query conditions can't reference custom properties/`calc()`, so this is
    the literal the multiple resolves to).
  - `.remarque-post-kicker` — the same mono kicker voice, scaled to sit above an
    individual post's own title.
  - `font-variant-caps: all-small-caps` on every kicker/dateline row, not
    `text-transform: uppercase` — the flagship predates the Small Caps rule and used
    uppercase throughout this pattern; corrected on the way upstream, same as the Essay
    Module's TOC summary.
- **`print.css`** — caps the masthead/lead title point sizes for print (28pt/18pt, matching
  this file's existing `body { font-size: 11pt; }` convention) instead of printing the
  on-screen fluid nameplate size; adds `.remarque-masthead`/`.remarque-lead`/
  `.remarque-entry-list` to the existing full-width-on-print selector list.
- **REMARQUE.md "Patterns"** — new top-level section (Broadsheet is its first entry),
  markup contract, the fluid-type decision writeup, and when-to-use guidance. Landing
  archetype's "Optionally includes" list now references it.
- **AGENT_RULES.md** — File Structure Convention lists `broadsheet.css`; Quality Checklist
  gains a Broadsheet-pattern line (`attr()` not `counter()`, `<ul>` not `<ol>`, small caps
  not uppercase).
- **Demo site (`site/`)** — `site/src/components/BroadsheetEntry.astro` (reference
  lead/entry component); `writing/index` restyled as a broadsheet archive (masthead + lead
  + entry list); `writing/against-decoration` gains the post-header kicker. New VR baseline:
  `broadsheet-{light,dark}-{desktop,mobile}.png` (4 files, `writing` path added to `PAGES`).

### Documentation
- **README.md "Graduation"** — adds this release to the "Historical examples" list; the
  "optional module" destination list now names the Broadsheet pattern alongside sidenotes/
  TOC rail/palette deck.

## 0.15.0 — 2026-07-23

Essay module — sidenotes + sticky TOC rail, graduated from the flagship (closes #52).

### Added
- **`essay.css`** (new subpath: `remarque-tokens/essay`, `remarque-tokens/essay.css`) —
  optional Essay-archetype module, not aggregated into `tokens.css` or `prose.css`. Adds:
  - `.remarque-sidenote-ref` / `.remarque-sidenote` — footnotes as in-flow margin notes.
    Small-print inline block below `80rem` (`--color-border-bold`, the note's only visual
    separator at that width); floats into the left gutter above it via a Tufte-style
    negative-margin technique (`clear: left` stacks consecutive notes, no JS). Numbered
    with CSS counters (`counter-reset` on `.remarque-prose`) rather than an authored number
    — this package ships no build step, unlike the flagship's rehype transform. A repeat
    citation of an already-noted footnote uses `.remarque-sidenote-ref--repeat` (styled
    identically, doesn't advance the shared counter).
  - `.remarque-footnotes` — a same-voice fallback for consumers without a DOM-reordering
    build step: styles GFM's default end-of-document footnotes section instead of relocating
    notes inline.
  - `.remarque-toc-rail` — `position: sticky` right rail at `>= 80rem`, plain inline
    collapsible `<details>` below it, same markup at every width (mono meta voice, small
    caps rather than `text-transform: uppercase` — the flagship predates that rule).
  - `.remarque-essay` — the opt-in 3-column grid shell (gutter / reading column / TOC
    rail) that places the above two. Center track is `minmax(0, var(--content-reading))`,
    identical to plain `.content-reading` centering; the grid never sets `max-width` or
    `margin-inline` on its children, so the reading-column measure is unaffected with or
    without this module.
  - Single breakpoint, `>= 80rem` (1280px) — re-derived from `--content-standard` /
    `--content-reading` / the core spacing scale rather than asserting the flagship's
    literal rem measurements. Deleting the `@media` block leaves the correct
    narrow-viewport/no-JS presentation, not a degraded one.
  - `grid-row: 1 / span 999` on the rail, not `1 / -1` — ships with the flagship's
    same-day grid-inflation fix already applied (`-1` resolves to row 1 with no explicit
    `grid-template-rows`, inflating it to the rail's own height).
- **`print.css`** — forces `.remarque-sidenote` back to inline mode and `.remarque-essay`
  back to block flow under `@media print`, making good on this file's existing "when a
  sidenotes module lands" comment. (`.remarque-toc-rail` was already caught by the
  existing `nav` / `[class*="toc-"]` print-hiding rules — no change needed there.)
- **REMARQUE.md "Essay Module"** — markup contract, when-to-use guidance, the
  breakpoint-behavior table, and the grid-inflation provenance note.
- **AGENT_RULES.md** — File Structure Convention lists `essay.css` (and, newly, `print.css`,
  which the convention had never mentioned); Quality Checklist gains an Essay-module line.
- **Demo site (`site/`)** — `writing/typography-as-interface` (the Essay archetype's VR
  reference page) now exercises both sidenotes and the TOC rail. VR baselines updated:
  `essay-{light,dark}-{desktop,mobile}.png` (4 files). New computed-style assertion:
  the TOC rail's bounding box never overlaps `.remarque-prose`'s reading column at the
  `1280px` desktop viewport.

### Documentation
- **README.md "Graduation"** — adds this release to the "Historical examples" list as
  the worked example of the "optional module" destination.



Triage bundle — prose/`.content-reading` pairing documented, `--motion-easing` bridged into the Tailwind v4 utility layer, USWDS/WCAG source citations added to the accessibility section (closes #23, closes #31, closes #32).

### Added
- **`ease-remarque` Tailwind v4 utility** — `theme.css`'s `@theme inline` block now maps `--ease-remarque: var(--motion-easing)`, mirroring the `transitionTimingFunction.remarque` mapping the v3 `tailwind.config.js` already carried. Utility-class users of `duration-[var(--motion-fast)]` previously fell back to Tailwind's default `ease` timing function instead of the token (#31).
- **Demo site** — every `duration-[var(--motion-fast)]` call site (22, across `site/src/pages/*`, `layouts/BaseLayout.astro`, `components/Meta.astro`) now pairs with `ease-remarque` so the rendered CSS carries `var(--motion-easing)` instead of Tailwind's default.

### Documentation
- **REMARQUE.md "Editorial Microtypography"** — states that `.remarque-prose` is typography-only (font, line height, numeral register, optical wrapping) and does not center the column; pair it with `.content-reading`, with a minimal code sample (#23).
- **REMARQUE.md "USWDS Accessibility Compliance"** — every cited WCAG 2.1 success criterion (1.4.3 Contrast Minimum, 1.4.11 Non-text Contrast, 2.5.5 Target Size, 2.3.3 Animation from Interactions, the last in the adjacent "Motion Rules" section) and USWDS claim (16px font-size floor, the overall accessibility approach) now links to its source (`w3.org/WAI/WCAG21/Understanding/*`, `designsystem.digital.gov`) (#32).

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
