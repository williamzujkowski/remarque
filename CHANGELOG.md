# Changelog

All notable changes to `remarque-tokens` are documented here. Token value
changes always state the design rationale — downstream sites pin against
these entries when syncing.

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
