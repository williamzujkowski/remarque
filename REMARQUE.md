# Remarque

**A typography-first design system for editorial, technical, and personal web projects.**

> In fine printing, a *remarque* is a small sketch drawn by the artist in the margin of a proof — a personal mark that distinguishes a limited edition from a mass run. This design system carries the same intent: every project built with Remarque should feel handmade, considered, and distinctly authored.

---

## Philosophy

Remarque exists because most developer sites and project pages look the same. They inherit the visual language of SaaS dashboards, startup landing pages, or component-library defaults. Remarque is the antidote: a system rooted in book typography, editorial design, and the quiet confidence of a well-made publication.

**Core beliefs:**

- Content is the hero. Components, motion, and color exist to support it.
- Typography is the primary visual system, not color, not illustration, not animation.
- Reading comfort always wins over ornamentation.
- Fewer components, used well, beat many components used carelessly.
- A personal site should feel *authored*, not assembled.

---

## Identity

Remarque projects should feel like a modern technical publication — not a generic app dashboard, not a startup landing page, not an admin panel.

**The system is:**
- Typography-forward and editorial
- Calm, precise, and spacious
- Readable and memorable
- Technical without being sterile

**The system is never:**
- Generic SaaS
- Decorative at the expense of reading
- Dense or dashboard-like
- Loud or attention-seeking

---

## Technology Stack

- **CSS framework:** Tailwind CSS — v4 via the shipped `remarque-tokens/theme.css` (`@theme inline` adapter; utilities reference the runtime tokens), or v3 via the shipped `tailwind.config.js`. One mechanism per project, never both.
- **Component primitives:** shadcn/ui (when reusable components are needed)
- **Markup:** Semantic HTML with ARIA landmarks
- **Theming:** Light and dark mode via `color-scheme` + `light-dark()` (issue #95, 0.24.0) — every `--color-*` token is one `light-dark(<light>, <dark>)` declaration under `:root { color-scheme: light dark; }`; system preference resolves automatically, the `[data-theme]` attribute (canonical) overrides `color-scheme` explicitly, and `:root.dark` is a compatibility bridge for class-keyed sites (sunset: 1.0) carrying the same override. **Raises the package's minimum browser floor** to Chrome/Edge 123+, Firefox 120+, Safari 17.5+ — see "Color Scheme & light-dark()". The audit parses both the new single-declaration form and the older two-declaration convention (mixed within one file, too). Mind the specificity asymmetry on the one remaining non-color theme-conditional token (`--weight-display`): `[data-theme=\"dark\"]` is (0,1,0), `:root.dark` is (0,2,0).
- **Accessibility:** USWDS-informed. Keyboard navigation, skip-to-content link, ARIA labels, WCAG AA contrast compliance, 44px touch targets, 14px minimum small text
- **Tokens:** Centralized CSS custom properties in two tiers — `tokens-core.css` (immutable identity) + `tokens-palette.css` (sanctioned personalization). `tokens.css` aggregates both. See "Token Tiers"
- **Fonts:** Self-hosted woff2 (no CDN dependency). Preloaded via `<link rel="preload">`
- **Package:** `npm install remarque-tokens` — subpaths: `remarque-tokens` (aggregator), `/core`, `/palette`, `/fonts.css`, `/tailwind`; ships `npx remarque-audit`. Copy path also supported: `fonts.css` + `tokens.css` + `tokens-core.css` + `tokens-palette.css` + `fonts/` travel together (the aggregator imports the tier files)

### Tailwind Spacing Integration Note

Never map Remarque's `--space-N` values onto Tailwind's default numeric spacing keys — in v4 `@theme` that means no `--spacing-9` through `--spacing-12`, and in a v3 config no `spacing: { "5"…"12" }` overrides. Remarque's scale is larger than Tailwind's (`--space-9` = 6rem vs Tailwind's 2.25rem), so colliding keys silently change utilities like `mt-12` from 3rem to 12rem. Both shipped artifacts namespace instead (`--spacing-remarque-N` in the reference `@theme`; `mt-remarque-N` utilities in `tailwind.config.js`). Tailwind's default numeric utilities keep their default values.

---

## Token Tiers

Tokens live in two files with different contracts:

| Tier | File | Contains | Override policy |
|------|------|----------|-----------------|
| **Core** | `tokens-core.css` | Type scale + 17px body floor, line heights, tracking, weights, spacing scale, `--content-standard`/`--content-wide`, radius ceiling, motion durations, prose/typography machinery | **Never overridden.** A site that changes these has forked Remarque — it is no longer a Remarque site, by definition |
| **Palette** | `tokens-palette.css` | Font slots (`--font-display/body/mono`), all `--color-*`, `--content-reading` (the measure, which moves with the body font) | **Override freely** in a site stylesheet loaded after the tokens. Every replacement palette must pass the audit in both themes: `npm run audit` in this repo, `npx remarque-audit --palette <file> --src <dir>` in a consumer project |

Package subpaths for consumers: `remarque-tokens` (aggregator), `remarque-tokens/core`, `remarque-tokens/palette`, `remarque-tokens/fonts.css`.

This makes compliance mechanical: a site that overrides only palette-tier tokens is *authored*; one that touches core-tier tokens has *forked*. `tokens.css` imports both tiers, so existing consumers are unaffected.

### Color Scheme & `light-dark()`

**0.24.0, closes #95.** Every `--color-*` token in `tokens-palette.css` is now authored as a single `light-dark(<light>, <dark>)` declaration under `:root { color-scheme: light dark; }`, replacing the previous convention of a full `:root` block plus a full, separately-maintained `@media (prefers-color-scheme: dark)` block re-listing every value a second time. This is the platform mechanism earlier releases of this file named as "the endgame to watch" — now adopted.

**Browser support floor — raised, stated prominently per "Governance & Deprecation":** `light-dark()` and `color-scheme` are baseline-stable but not ancient: **Chrome/Edge 123+, Firefox 120+, Safari 17.5+**. A site whose audience needs to support an older engine should stay on remarque-tokens `<0.24.0`, or override the affected `--color-*` tokens with plain `oklch()` values in its own palette (the audit accepts either form — see "How the parser handles this" below). This is the MINOR-with-rationale case the Governance section's semver contract now names explicitly: no token was removed or renamed, and every consumer's `var(--color-x)` still resolves — only the minimum browser engine that renders it *correctly* moved forward, which is why this ships as a minor rather than a major.

**How theme selection now works:**
- **System preference (no explicit choice).** `color-scheme: light dark` on `:root` is sufficient by itself — every `light-dark()` call resolves from `prefers-color-scheme` directly. No `@media (prefers-color-scheme: dark)` color block is needed anymore; it and its full duplicated value list are **retired**.
- **Explicit user choice.** `[data-theme="light"]`/`[data-theme="dark"]` now override `color-scheme` itself, once — not every token's dark value a second time. `[data-theme="dark"] { color-scheme: dark; }` / `[data-theme="light"] { color-scheme: light; }`.
- **`:root.dark` compatibility bridge.** Unchanged status — still bridges class-keyed consumer sites, still sunsets at 1.0 (see the Deprecation windows table). It carries the same `color-scheme: dark` override as `[data-theme="dark"]`, kept **minimal** by design: colors need nothing else now that they resolve through `color-scheme`.

**`--weight-display` is the one exception — and stays on the old mechanism, on purpose.** `light-dark()` is restricted to `<color>` values; `--weight-display` is a `font-weight` (400/500, dark-mode serif-hairline compensation, issue #59), so it cannot be expressed as `light-dark(400, 500)`. It keeps the pre-migration `@media (prefers-color-scheme: dark)` + `[data-theme="dark"], :root.dark` blocks — now carrying only this one token instead of the whole palette, which is the honest characterization: this isn't a compromise or a leftover, it is genuinely the smallest correct mechanism available for a non-color theme-conditional token. A registered-property `light-dark()`-abuse trick was considered and rejected — the conventional blocks are simpler, already-audited, and touch exactly one token; inventing a workaround to avoid two small blocks would be solving a non-problem.

**The `prefers-contrast: more` override (issue #93) simplifies from three blocks to one.** Pre-migration this needed a plain `:root` override, a `[data-theme="dark"], :root.dark` override, and a compound `@media (prefers-contrast: more) and (prefers-color-scheme: dark)` override — three copies of two tokens, to cover system-default, explicit-dark, and system-dark-without-an-explicit-choice respectively. Under `light-dark()`, one un-scoped `light-dark(<light>, <dark>)` override per token replaces its whole value at once and re-resolves per element from whatever `color-scheme` is already active there — there is no dark-specific selector left to write. See `tokens-palette.css`'s `@media (prefers-contrast: more)` block.

**The site's `[data-theme="light"]` mirror — retired, not merely updated.** Before this migration, an explicit light choice had no mechanism of its own, so the demo site hand-carried a full `[data-theme="light"]` block re-declaring every `--color-*` value (a known drift trap, guarded by `scripts/palette-golden.mjs`'s "site mirror" check). Explicit light selection is now a bare `color-scheme: light` override — the color values live in exactly one place (the `light-dark()` declaration itself) — so there is no second copy left to drift. The mirror block is deleted from `site/src/styles/globals.css`; `scripts/palette-golden.mjs`'s mirror check now asserts the *absence* of any `--color-*` redeclaration there instead of comparing two copies of a value that no longer has a second copy.

**How the parser handles this (`scripts/lib/css-tokens.mjs`).** `splitLightDark(value)` depth-aware-splits a `light-dark(a, b)` value into its light/dark sides (so a side that is itself `oklch(...)` or `var(...)` doesn't confuse the single top-level comma being looked for). `resolveSide(decls, side)` collapses a flat decls map to one theme side — a no-op for any value that isn't a `light-dark()` call, which is what makes this fully backward compatible: a palette using only the old two-block convention parses identically to before. `darkOverridesOf(rawLightRootDecls, rawDarkBlockDecls)` merges the `light-dark()` dark sides found in the top-level `:root` block with whatever a conventional dark block still declares (mixed-form palettes are supported — a consumer may migrate some tokens and leave others in the old convention in the same file), with the conventional-block value winning on conflict — matching real CSS cascade order (a later dark-block declaration overrides an earlier `:root` one at equal specificity). `scripts/audit.mjs`, `scripts/palette-golden.mjs`, `scripts/drift-check.mjs`, and `scripts/tokens-json.mjs` all route through these three functions now; none of them changed their own contrast/golden/drift logic, only how they extract light/dark values first. Fixture-tested in `scripts/test-audit.mjs`: a pure `light-dark()` palette, a mixed-form palette (some tokens migrated, some not), a `light-dark()` value that fails contrast on its dark side, and every pre-existing conventional-form fixture, all green.

**`scripts/theme.mjs` (the `remarque-theme` bridge) is intentionally unchanged — still emits the conventional two-block form.** Its output is a *palette override* a consumer imports after this package's own tokens; keeping it on the older, more universally-parseable convention is the lower-churn choice — every consumer regardless of remarque-tokens version can consume it, and the parser above already treats both forms identically. It is not a compromise either: modernizing the bridge's own emission to `light-dark()` is deferred to a later major, noted here so it isn't silently forgotten.

**`tokens.json` is unaffected in content.** The authoring-form change is purely how the CSS expresses a value, not what the value or token name is — regenerating `tokens.json`/`tokens.d.ts`/`tokens.schema.json` from the migrated CSS produces byte-identical output (aside from the `version` field), verified in this release.

**Visual regression: zero baseline changes.** Every `--color-*` value is unchanged — only the CSS mechanism producing it moved. The Playwright visual-regression suite's screenshot baselines are expected to be pixel-identical; any diff would indicate a transcription error in the migration, not an intended appearance change.

### DTCG Conformance

`tokens-core.css` and `tokens-palette.css` remain the single source of truth; `scripts/tokens-json.mjs` regenerates `tokens.json`, `tokens.d.ts`, and `tokens.schema.json` from them in one pass (`node scripts/tokens-json.mjs`; `--check` gates CI freshness). `tokens.json` carries a `$schema` pointer to the published schema (served by the demo site at `/tokens.schema.json`, alongside `/tokens.json` — also exported as `remarque-tokens/tokens.schema.json`).

`tokens.json` is **conformant in spirit** with the [Design Tokens Community Group (DTCG)](https://www.designtokens.org/) format — every token carries `$value`/`$type` — with three **deliberate** structural divergences from the DTCG 2025.10 format, documented in the generated file itself (`$extensions.remarque.dtcg`) so a future regeneration can't lose the rationale:

1. **Color values are `oklch()` CSS strings**, not the DTCG structured color object (`{ colorSpace, components, alpha }`). Remarque's color pipeline (audit, drift-check, `remarque-theme`) is built entirely on parsing/emitting `oklch(L C H)` strings; adopting the structured form would mean carrying two color representations in parallel for no present benefit.
2. **Palette-tier tokens nest per-token `light`/`dark` groups**, each with its own `$value`, rather than a single `$value` plus the Resolver module's `theme` modifier with `contexts`. This repo's own theming (`light-dark()` + `color-scheme`, `[data-theme="dark"]`, the Palette Deck's `[data-palette]` scoping — see "Color Scheme & light-dark()") predates the Resolver module and is what the tooling depends on.
3. **Dimension and duration `$value`s are CSS strings**, not `{ value, unit }` objects. For example `core.text-display` is `"clamp(2.75rem, 5.5vw, 5rem)"` with `$type: dimension`, and `core.motion-fast` is `"120ms"`. DTCG 2025.10 requires `{ value, unit }`, and `clamp()` has no DTCG form, so any DTCG export would have to flatten or drop fluid values.

**The #99 trigger fired on 2025-10-28.** The DTCG [Format](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/), [Color](https://www.w3.org/community/reports/design-tokens/CG-FINAL-color-20251028/) and [Resolver](https://www.w3.org/community/reports/design-tokens/CG-FINAL-resolver-20251028/) modules were published as Final Community Group Reports. A Community Group cannot produce a W3C Recommendation, so a Final CG Report is the furthest a CG document goes and the gate is not "pending a Recommendation". Conformance is therefore **permitted**, and the earlier rule against "fixing" `tokens.json` toward unratified drafts is retired. It is still **not built**: the CSS remains the source of truth, and the three divergences stay load-bearing for the tooling that depends on this shape.

**Demand gate for a DTCG export.** Build an additive `tokens.dtcg.json` (and a resolver file if useful) only when either holds:

- **(a)** a consumer files an issue asking for a DTCG 2025.10-shaped file; or
- **(b)** Style Dictionary or Terrazzo documents full 2025.10 support *including resolver output*.

Branch (b) measures tooling readiness rather than demand and is kept because it can be checked independently. The export would be additive, generated from the CSS by `scripts/tokens-json.mjs`; `tokens.json`, `tokens.d.ts` and `remarque-drift` are not changed by it. Decided in #132.

---

## Color Providers

The palette tier (all `--color-*` tokens) can be *supplied* rather than hand-authored — Remarque focuses on typography, and a color-provider package can own the personalization surface it already sanctions.

[`@williamzujkowski/oklch-terminal-themes`](https://www.npmjs.com/package/@williamzujkowski/oklch-terminal-themes) is the reference provider: a dataset of terminal color schemes converted to OKLCH. Run it through the bundled bridge:

```
npx remarque-theme <light-slug> [--dark <dark-slug>] [-o palette-override.css]
```

Terminal themes carry only `background/foreground/cursor/selection` + 16 ANSI slots — a few of Remarque's 24 semantic slots map directly, and most themes fail the AAA `fg-muted` 7:1 line as authored. So `remarque-theme` *derives* rather than maps: **hue and chroma carry the theme's personality; lightness is KEEP-IF-PASSING**. For the slots that have a meaningful "theme's own value" — `fg`, `accent`, `accent-hover`, and (in dark) `selection-fg`/`code-fg` — the theme's own authored lightness is kept as-is when it already clears the slot's contrast target; lightness is solved (binary search, same targets as the Enforcement Checklist below, with in-gamut chroma clamping) *only* when it doesn't. Every other slot (`fg-muted`, `muted`, `border-bold`, the bg ladder, `selection-bg`, `accent-subtle`) is solved/derived unconditionally, as it always was — those don't carry an independent authored value to preserve. This means a well-designed input theme comes through close to its own feel instead of being flattened to the exact threshold; a theme that fails a target still gets a value that passes, exactly as before. The accent hue comes from the theme's cursor color if it's chromatic, otherwise the most saturated classic ANSI color, and is kept consistent between the light and dark half of a pair.

The audit remains the gate regardless of provenance — `remarque-theme` self-verifies its own output against the same checks before it will emit anything, but a site that hand-edits a generated palette (or points at a provider with pathological input colors) still runs through `remarque-audit` in CI like any other palette.

**Pairing contract:** dataset 0.2.0+ carries a `counterpart` field linking each paired theme to its canonical opposite-polarity variant ([`oklch-terminal-themes#128`](https://github.com/williamzujkowski/oklch-terminal-themes/issues/128)), and `--dark` defaults to it — `npx remarque-theme rose-pine-dawn` alone derives the rosé-pine pair. For a light theme without a counterpart (or an older dataset), `--dark <slug>` remains required; nothing is ever guessed from names. `remarque-theme` also rejects a light slug that isn't tagged `isDark: false` and a dark slug that isn't tagged `isDark: true`.

**Identity/serialization contract (#76):** the default palette shipped in `tokens-palette.css` is not an independent hand-design — its **identity** is bound to the upstream `remarque-light`/`remarque-dark` native themes in `@williamzujkowski/oklch-terminal-themes` (pinned exact devDependency), derived through the same `remarque-theme` bridge as any other consumer's palette. `tokens-palette.css` itself is that identity's **serialization**: a stable, human-authored file with designed round numbers and hand comments, kept perceptually identical to what the bridge derives. `scripts/palette-golden.mjs` is the CI gate that proves this — it derives the reference palette from the pinned themes, compares every `--color-*` token in both files via CIEDE2000 (ΔE2000 ≤ 2.0, reported per token, always printed so drift stays visible before it reaches the threshold), and separately asserts that `site/src/styles/globals.css`'s `[data-theme="light"]` mirror block stays string-identical to `tokens-palette.css`'s `:root` light value (a known drift trap). A breach means the upstream themes and the hand file have diverged — reconcile one against the other; the gate does not loosen.

---

## State Colors

Four semantic slots — `--color-error`, `--color-success`, `--color-warning`, `--color-disabled` — for feedback moments: form validation, status banners, disabled controls. **These are for feedback, not decoration.** The one-accent rule ("Visual Rules" / "Changing the Accent Hue") still governs expressive color everywhere else — a state color says "this specific thing failed/succeeded/needs attention/can't be used right now," not "this section is important." Don't recolor headings, borders, or chrome with a state color; reserve it for the actual feedback element (an inline error message, a success toast, a disabled button's text).

Three of the four carry a `-subtle` companion — `--color-error-subtle`, `--color-success-subtle`, `--color-warning-subtle` — a faint tinted background for callout/banner-style feedback (an error banner, a success toast), sized the same way `--color-accent-subtle` is: near-`--color-bg` lightness, the state's hue, low chroma. `--color-disabled` has no `-subtle` companion — a disabled control is quieter than its enabled state, not tinted; use `--color-surface`/`--color-bg-subtle` for a disabled control's background if it needs one.

| Slot | Use for | `-subtle` companion |
|---|---|---|
| `--color-error` | Validation errors, failure states, destructive-action confirmation text | `--color-error-subtle` (banner/callout background) |
| `--color-success` | Confirmation messages, completed states | `--color-success-subtle` |
| `--color-warning` | Caution messages, states needing attention before proceeding | `--color-warning-subtle` |
| `--color-disabled` | Text/icon color for a disabled control | — (no subtle background; see above) |

**Derivation:** hand-authored in `tokens-palette.css` from the house ANSI hue conventions — error hue 25 (red), success hue 145 (green), warning hue 85 (yellow) — the same conventions `--color-syntax-string`/`--color-syntax-constant` already use for green/yellow. `scripts/remarque-theme` derives all three from a source theme's `red`/`green`/`yellow` ANSI slots (keep-if-passing lightness, checked against the **stricter** of `--color-bg` and `--color-surface` at once, not just one), exactly like every other slot in "Color Providers." `--color-disabled` is deliberately **not** ANSI-derived — it aliases the already-derived neutral `--color-muted` family, since a disabled state is a muted/quiet register, not a hue. Warning (hue 85, yellow) is the hard case in light mode — yellow has low luminance-contrast against a light background, so its solved lightness sits noticeably darker than the other two states, the same shape as `--color-syntax-constant`'s solve. Every state text color holds ≥ 4.5:1 against `--color-bg` **and** `--color-surface` in both themes; every `-subtle` background holds `--color-fg` ≥ 4.5:1 on it (the pairing that matters for a callout's body text) — both enforced by `scripts/audit.mjs` and golden-gated (ΔE2000 ≤ 2.0) against the upstream themes like the rest of the default palette.

---

## Font Slots

Remarque uses a three-slot font system. Each slot has a strict role, and each slot accepts a small set of approved faces — swap the face, keep the role.

| Slot | Default | Approved substitutes | Usage |
|------|---------|----------------------|-------|
| **Display** (`--font-display`) | Newsreader | Fraunces (display sizes only, ≥2rem — its optical character does not survive smaller sizes) | Page titles, hero headings, article titles |
| **Body** (`--font-body`) | Inter | Source Serif 4, system-ui stack | Body text, UI labels, navigation, buttons |
| **Mono** (`--font-mono`) | JetBrains Mono | IBM Plex Mono | Metadata rows, code blocks, labels, technical accents, timestamps |

**Font rules:**
- The display face is used *only* for display text at or above the section heading size. Never for body copy.
- The body face is the workhorse. All body text, UI elements, and navigation use it.
- The mono face is reserved for metadata, code, technical labels, and small accents. It is never used for headings or body text.
- Faces outside the approved lists require a spec amendment, not a silent swap. A fourth "accent" slot (hand-written or decorative faces) is not part of core Remarque; sites that add one must restrict it to marginalia and never prose.

### Measure Compensation

`--content-reading` is calibrated to the body font — 38rem gives a median of ~71 characters per line at 17px **Inter**. When you swap the body slot, change the measure with it (target: a **median of 66–72 measured characters per line** at `--text-body`, p90 under ~78):

| Body face | `--content-reading` | Measured at 17px (median / p90 chars per line) |
|-----------|--------------------:|-----------|
| Inter (default) | 38rem | 71 / 76 — this repo's demo essays, 2026-10 |
| system-ui stack | 38rem | metrics close to Inter — measure your target platform's face |
| Source Serif 4 | 38rem | 73 / 78 — measured on williamzujkowski.github.io, the reference consumer (#116) |

**Measure in rendered characters, never in `ch`.** `1ch` is the advance width of the digit "0", which is wider than the average letter-plus-space of proportional text, so `ch` arithmetic overstates how few characters fit. Until 0.27.0 this table said 46rem ≈ 70 ch for Inter; rendered, 46rem set a median of **86** characters per line (p90 93) — past Butterick's 90 at the tail. To measure: for each body paragraph, walk its text nodes with a `Range` per character, group `getClientRects()[0].top` into lines, drop each paragraph's last (short) line, and take the median and p90 across the page (spaces count; skip `code`/`sup`). The demo's computed-style suite runs exactly this check.

This is why the measure is palette-tier: it is a property of the font choice, not of the system's identity. The *target character count* is the invariant.

**Known limitation: Latin script only.** The table above, and the `ch`-based measure math behind it, assume Latin-alphabet conventions — character width roughly proportional to em-height, word-space-separated tokens, left-to-right flow. None of that holds for CJK, Arabic, or Devanagari body text: CJK measure is conventionally counted in full-width characters per line, a different unit than a Latin `ch` entirely; Arabic's contextual letterforms and right-to-left flow change what "character count" even means; Devanagari's conjunct consonants and matras make per-character width too irregular for a single ch-target to describe. Remarque has not derived a measure-compensation row for any non-Latin script — a site setting CJK/Arabic/Devanagari body copy needs to work out its own measure the way this table works out Latin ones; the ch-target does not transfer by assumption. Named here honestly, in the same spirit as this spec's Butterick line-spacing deviation write-up further down, rather than left for a future non-Latin consumer to discover the hard way.

**What Remarque does guard (0.28, #123).** Layout is written in logical properties (`margin-inline-start`, `float: inline-start`, `text-align: start`/`end`), so `dir="rtl"` mirrors the essay grid, sidenotes, TOC rail, blockquote bar, lists, tables and drop caps with no extra CSS. The tracking and display-leading tokens are reset under `:lang()`: `ar`, `fa` and `ur` get zero tracking (negative or positive tracking breaks cursive joining); `zh`, `ja` and `ko` get zero display tracking and 1.35–1.4 heading leading. The decorative italics (blockquote, pullquote, `h5`, `dt`, drop caps, the masthead's italic half, the lead's lede) set upright for `ar`, `fa`, `ur`, `he`, `zh`, `ja` and `ko`, which have no italic tradition and get a faked slant otherwise, and `em` carries its emphasis in weight. The fonts have no glyphs for these scripts, so the guards only stop the tokens from harming whatever face the fallback stack picks; choosing that face, and the measure, is still the consumer's job. `site/tests/rtl.spec.ts` gates the mirroring and the guards.

---

## Type Scale

Seven rungs, in two kinds (0.30, #131). The **text rungs** are fixed: 13, 14, 17 and 19px (`--text-micro`, `--text-meta`, `--text-body`, `--text-body-lg`). Their steps (1.08, 1.21, 1.12) aren't a modular ratio; each rung is a floor. 13 and 14 are the USWDS minimums for fine print and small text, 17 is Remarque's body minimum, and 19 is the lede. The **display rungs** are fluid: `--text-section`, `--text-title` and `--text-display` scale with the viewport between fixed bounds. So the scale changes *shape* with the viewport, not only size, and that's deliberate. On a phone the headings sit close to the text (steps 1.16, 1.36, 1.47) so a title doesn't eat the screen; on a desktop they open out to about a 1.5 ratio:

| Viewport | section | title | display | steps from the 19px lede up |
|---|---|---|---|---|
| 375px | 22px | 30px | 44px | 1.16 · 1.36 · 1.47 |
| 1280px | 28.8px | 44.8px | 70.4px | 1.52 · 1.56 · 1.57 |
| 1920px | 32px | 48px | 80px | 1.68 · 1.50 · 1.67 |

There's no rung between 19 and the section heading (1.52 at 1280px); headings are meant to be a clear jump from text, not a gradient. Any change to a rung's *value* is a core-tier change and goes to a vote first.

**Heading ladder in prose.** Adjacent levels differ in face or style, not only in size, so each still reads as its own level in print and under forced colors:

| Level | Face | Size / weight |
|---|---|---|
| `h2` | display (Newsreader) roman | `--text-section` / medium |
| `h3` | body (Inter) | 19px / semibold |
| `h4` | display roman (0.30; was Inter 17/600, which read as h3) | 17px / medium |
| `h5` | display italic | 17px / medium |
| `h6` | mono | 14px |

**The lede is in `--color-fg`.** `.text-body-lg` sets no color. Give a standfirst full foreground; its size and leading already set it apart, and in `--color-fg-muted` it read *quieter* than the body below it, which inverts the hierarchy. (The demo and this spec's samples used `fg-muted` until 0.30.)

## Editorial Microtypography

The book-craft layer: numerals, small caps, drop caps, pull quotes, and optical wrapping. These are the details that separate typeset prose from a web page that merely uses nice fonts.

`.remarque-prose` supplies typography only — font, line height, numeral register, optical wrapping — and stops short of centering the column, so pair it with `.content-reading` wherever the reading column needs to sit centered on the page:

```html
<div class="remarque-prose content-reading">
  <!-- article body -->
</div>
```

### Numerals

Two numeral registers, chosen by context:

- **`.remarque-prose`** uses `font-variant-numeric: oldstyle-nums proportional-nums` — text figures that sit quietly inside a sentence, the way numerals behave in well-set book prose — **when the body face has them** (an `onum` feature). The default body face, Inter, has no `onum`, and neither does the default display face, Newsreader, so on the default stack prose and the broadsheet entry numerals set **lining** figures; the request is a no-op there, not a fake. A body face that has `onum` (the flagship's Source Serif 4) gets text figures from the same declaration with no change. Both rules carry a `remarque-feature: conditional` marker, so `remarque-audit` reports them as conditional rather than failing them (0.28, #124).
- **`.text-meta`** (and anything sharing its role — dates, counts, table cells, timestamps) uses `font-variant-numeric: tabular-nums lining-nums` — full-height, fixed-width digits that align in columns and don't jitter as they change.

Never mix the two: a numeral inside running prose should never be tabular, and a numeral in a metadata row or table should never be oldstyle. Apply `.num` to any `<td>`/`<th>` holding numeric data to opt that cell into the tabular-lining register (see prose.css's table rules).

### Small Caps

Labels that want a caps-like treatment use **real capitals with added tracking** on faces without small caps, and **true small caps only on a face that has them** (0.28, #124, ratified 7–0 in `vote-1792819660668-a5kb6q3`; this replaces the #51 rule).

- **The default stack has no small caps.** None of the shipped fonts (Inter, Newsreader, JetBrains Mono) has `smcp` or `c2sc`, and neither do their full upstream releases. When CSS asks for `font-variant-caps: all-small-caps` on such a face, the browser *synthesizes* small caps by shrinking capitals: no corrected weight or spacing, and a 14px label draws its caps at about 9.9px, under the 13px floor. Until 0.28 that was every Remarque label.
- **So the default is capitals:** `text-transform: uppercase` plus `letter-spacing: var(--tracking-caps)` (0.06em), Butterick's rule for faces without small caps. `.text-label` (mono, `--text-meta`, uppercase, `--tracking-caps`, `--color-muted`) is the sanctioned utility, and the module labels repeat it: kickers and datelines, the TOC summary, the footnotes heading, form labels. Keep the 14px (`--text-meta`) size; `--text-micro` stays reserved for timestamps.
- **Real small caps are still the finer choice where they exist.** If your label face has both `smcp` and `c2sc`, set `font-variant-caps: all-small-caps; text-transform: none;` on `.text-label` in your own CSS, and give `remarque-audit` a manifest for that face (`--font-features`) so the gate can see the features.
- **Enforced.** `remarque-audit` fails any rule that asks a face for a feature it lacks (small caps, oldstyle figures, `font-feature-settings` tags), checked against `fonts/features.json`. That's the OpenType feature list of every shipped face, generated with fontTools by `scripts/font-features.py`. A rule that is deliberately face-dependent says so with a `remarque-feature: conditional` comment and is reported, not failed. Consumers add their own faces with `--font-features <manifest.json>` (same shape). Defaults count: a face whose default figures are lining satisfies `lining-nums` without `lnum`, and a tabular-by-default face satisfies `tabular-nums` without `tnum`.
- Uppercase for *running text* (a shouted sentence, a heading set in caps) is still out: the rule is about labels.

### Code Blocks, Figures and Links

- **Code-block titles.** `data-title="src/config.ts"` on a `<pre>` inside `.remarque-prose` renders a mono filename line across the top of the block, with a hairline under it and no filled tab (0.30, #129). Shiki and rehype-pretty-code can both emit the attribute.
- **Line highlighting** belongs to your highlighter's markup. Remarque supplies only the color: an element marked `data-highlighted-line` (rehype-pretty-code's attribute) gets the `--color-accent-subtle` wash that `mark` uses.
- **Figures** sit in the column: `.remarque-prose figure` cancels the browser's 40px side indent, and its vertical rhythm comes from the prose flow like any other block.
- **External-link marks (opt-in).** `.remarque-prose--external-marks` adds a small ↗ after links marked `rel="external"`, on screen only. `print.css` prints each link's URL with `::after`, and a screen marker on the same pseudo-element would replace it. The arrow has empty alt text; `rel` carries the meaning.
- Code blocks never wrap; they scroll in their own box (see "Wrapping & Optical Defaults").

### Drop Caps (opt-in)

`.remarque-prose--dropcap`, applied alongside `.remarque-prose`, floats a large italic display-face initial letter on the first paragraph only — the way a printed essay opens its first page. Rules:

- Essay first paragraph only — never mid-article, never in Dossier/Notebook/Landing content.
- Uses `initial-letter` where supported, with a `float` + font-size fallback for browsers that lack it.
- Inherits `--color-fg` — the drop cap is not a place for accent color.
- Skipped automatically when the paragraph opens with a quote or inline code (the ornament assumes a plain capital letter).
- Opt-in only. Most pages should not use it; it is reserved for essays that want a printed, literary register.

### Pull Quotes

`.pullquote` is not `.remarque-prose blockquote`. A blockquote cites someone else; a pullquote re-states the article's own words as a visual accent — a magazine convention. Rules:

- Display italic at `--text-section` size, not blockquote's body-italic.
- Hairline rules above and below (`--color-border`), no background, no accent color.
- If the pulled text duplicates body copy verbatim, mark the element `<aside aria-hidden="true">` so screen readers don't hear it twice.
- At most one per screen — it is a rare accent, not a recurring motif.

### Wrapping & Optical Defaults

- Headings: `text-wrap: balance`, `font-optical-sizing: auto`, `font-synthesis: none` — headings never wrap ragged, optical sizing lets variable fonts pick the right grade, and browsers never fake bold/italic for faces that don't have them.
- Prose: `text-wrap: pretty` (avoids single-word orphan lines) and `hanging-punctuation: first last` (quotes and punctuation hang outside the measure rather than indenting the line).
- All four properties degrade safely — unsupported browsers silently ignore them and fall back to normal wrapping. Invisible when absent, unmistakable when present.
- What renders where (webstatus.dev, checked 2026-10-24). These are enhancements, so a reader on an unsupported browser gets ordinary, correct text, not a broken page:

  | Property | Chrome / Edge | Firefox | Safari | Remarque's fallback |
  |---|---|---|---|---|
  | `text-wrap: balance` | 114 | 121 | 17.5 | normal wrapping (Baseline 2024) |
  | `text-wrap: pretty` | 117 | — | 26 | normal wrapping; orphans possible |
  | `hanging-punctuation` | — | — | yes | quotes sit inside the measure |
  | `initial-letter` (drop caps) | 110 | — | prefixed (`-webkit-initial-letter`) | the `float` drop cap in prose.css |
  | `font-variant-caps` small caps | needs `smcp`/`c2sc` in the font | same | same | synthesized; why labels are capitals (see "Small Caps") |
  | `oldstyle-nums` | needs `onum` in the font | same | same | lining figures (see "Numerals") |
- Long strings: `html { overflow-wrap: break-word; }` (`tokens-core.css`, 0.28, #122). A URL, hash, package path or long inline `code` that can't fit its line breaks instead of widening the page (WCAG 1.4.10 Reflow). It changes nothing for text that fits and inherits into every layer and consumer chrome. `break-word` doesn't shrink an element's min-content width, so the flex labels that must narrow past a long word (TOC rail links and summary, buttons, checkbox and radio labels) use `overflow-wrap: anywhere`; do the same in your own flex or grid chrome. Code blocks are the exception on purpose: `<pre>` keeps `white-space: pre` and scrolls horizontally inside its own box (`overflow-x: auto`), because re-wrapping code changes what it says. Wide tables likewise scroll inside `.scroll-wrap` (prose) or `.remarque-table-wrap` (forms); a bare wide table still widens the page.

---

## Visual Rules

### Do

- Use spacious layouts with generous whitespace
- Use a slightly oversized type scale (body text at 17px minimum)
- Constrain reading widths for prose (max 38rem / ~608px — about 71 characters of Inter)
- Use quiet, subtle borders over shadows
- Use strong vertical rhythm and consistent spacing
- Keep components visually quiet and subordinate to content
- Use mono text for metadata, timestamps, tags, and technical details

### Do Not

- Use Material Design visual language
- Use loud or decorative gradients
- Spam cards as a layout pattern
- Use over-rounded corners ("friendly SaaS" aesthetic)
- Build dense dashboard-style layouts
- Use animation that draws attention to itself
- Allow full-width prose on large screens
- Use glassmorphism or frosted-glass effects
- Stack decorative UI for its own sake

---

## Content Density Rule

No page should show more than three distinct content sections above the fold. The first screen of any page contains only: title, metadata, and the opening of content. Hero sections with CTAs, feature grids, and social proof are not part of Remarque's vocabulary. (The CLI-tool landing install block, see the Landing archetype, is a single command — not a CTA — and does not count against this rule.)

---

## Image Treatment

Remarque is typography-first, but projects include screenshots, architecture diagrams, and terminal captures. These follow strict rules:

- Images sit within the reading column width (max `--content-reading`), never wider
- Images receive a 1px border using `--color-border` — never drop shadows
- Captions use mono text (`--font-mono`) at `--text-meta` size
- Architecture diagrams and terminal captures may extend to `--content-standard` width
- No rounded corners on images beyond `--radius-sm`
- Images are never decorative — every image must serve the content

### Plate (screenshot-heavy pages)

Reference/Docs and Project Dossier pages often need to show several screenshots — six or more UI captures walking through a workflow — where "one image at a time" doesn't scale. Plate is the sanctioned pattern; everything above still applies, it only adds:

- Default to single-column figures at `--content-reading` width, one screenshot per figure
- Every figure gets a numbered mono caption in the form `Fig. 01 — description` (`--font-mono`, `--text-meta`) — the number is mandatory once a page has more than one figure, so prose can cross-reference a specific plate
- A 2-up grid is permitted only for terminal/CLI captures, and only at `--content-standard` width — the one sanctioned exception to "images never wider than `--content-reading`," reserved for this narrow case
- A page with six or more plates gets prev/next figure navigation (mono, matching Reference/Docs' footer convention) rather than an unbroken scroll

---

## Dataviz Tokens

Charts are a first-class Remarque surface: `tokens-palette.css` ships 6 hand-authored `--color-viz-*` categorical slots, bridge-derived and golden-gated against the upstream `remarque-light`/`remarque-dark` themes' `dataviz.categorical` block the same way the rest of the default palette is (issue #94 — the syntax-palette pattern's fourth application). The rest of a chart still maps onto vocabulary that already exists, so it survives a palette swap the same way prose and chrome do:

- **Grid lines** use `--color-border` — never a separate "chart gray." Grid lines are structural, not decorative, and already have a sanctioned quiet role.
- **Axis text and tick labels** use `--font-mono` at `--text-meta`, `--color-muted` — the same register as metadata rows and captions, never the body or display face.
- **Categorical color** uses `--color-viz-1` through `--color-viz-6` (below) — never `--color-accent`, so chart color is never mistaken for the system's one interactive signal.

### Slots

6 slots, not 8 — the upstream dataset's own floor: 516 of the 633 corpus themes ship exactly 6 `dataviz.categorical` entries, so shipping 8 would leave 2 unfillable on most themes. Every slot is verified ≥ **3:1** against `--color-bg` in both themes — Carbon's mark-on-background line, not text's 4.5:1. The distinction is deliberate: a chart mark is a small area read at a glance and identified by hue difference from its neighbors, not a string of characters read continuously letter-by-letter, so it gets the WCAG 1.4.11 non-text threshold (the same one `--color-border-bold` already uses for functional borders), not 1.4.3's text threshold.

| Slot | Light | Dark |
|---|---|---|
| `--color-viz-1` | `oklch(0.538 0.121 250.5)` — 4.74:1 | `oklch(0.708 0.129 249.5)` — 7.53:1 |
| `--color-viz-2` | `oklch(0.541 0.111 85.5)` — 4.73:1 | `oklch(0.712 0.13 85.3)` — 7.54:1 |
| `--color-viz-3` | `oklch(0.524 0.12 24.6)` — 5.35:1 | `oklch(0.724 0.129 310.2)` — 7.55:1 |
| `--color-viz-4` | `oklch(0.499 0.12 144.8)` — 5.32:1 | `oklch(0.725 0.129 25.4)` — 7.55:1 |
| `--color-viz-5` | `oklch(0.524 0.121 309.6)` — 5.33:1 | `oklch(0.696 0.129 144.9)` — 7.53:1 |
| `--color-viz-6` | `oklch(0.528 0.09 195.8)` — 4.74:1 | `oklch(0.697 0.119 194.8)` — 7.57:1 |

**Order is not reconciled hue-for-hue across the pair.** The upstream `dataviz.categorical` order for `remarque-light` (blue, yellow, red, green, purple, cyan) does not match `remarque-dark`'s (blue, yellow, purple, red, green, cyan) — verified directly against the shipped dataset. `--color-viz-3` is reddish in light mode and purplish in dark mode. This is the same stance the rest of this file already takes for every other slot: **dark mode is independently tuned, not an inversion** — it is not a bug that a toggle recolors series 3, any more than it is a bug that `--color-fg`'s exact hue differs by theme.

**Non-color redundancy (Carbon precedent, mandatory):** never use `--color-viz-*` as the *sole* distinguisher between series. Pair every categorical color with a second channel — a distinct marker shape (circle/square/triangle), a line dash pattern, or a direct end-of-line/legend label — so the chart still communicates under color-vision deficiency or `forced-colors: active` (which the marks themselves do not attempt to survive; see "Forced Colors & Contrast Preferences" for what *is* covered). This mirrors [tsundoku](https://github.com/williamzujkowski/tsundoku)'s `DESIGN-NOTES.md`, which documents an 8-hue "orthogonal category system" kept deliberately separate from its accent — the categorical slots above formalize that instinct as an audited, bridge-derived token set instead of a hand-picked one-off.

### Derivation

`remarque-theme` derives all 6 slots from the source theme's own `dataviz.categorical` array (dataset 0.5.0+) — first 6 entries, in the dataset's order, same keep-if-passing-else-solve pattern as every other slot, targeted at `--color-bg` (not `--color-surface`) at 3:1. Chroma is capped at 0.14, the same ceiling as `--color-accent`/`--color-syntax-*`. `scripts/palette-golden.mjs` extends its ΔE2000 ≤ 2.0 gate to all 6 slots.

**Fallback (dataset predates the field):** an installed `@williamzujkowski/oklch-terminal-themes` older than 0.5.0 — still legal under this package's `>=0.1.0` peerDependencies floor — has no `dataviz` block at all. `remarque-theme` does **not** attempt to synthesize a categorical ramp from raw ANSI colors in that case: the upstream categorical-selection algorithm is undocumented, and approximating it could silently diverge from what a real 0.5.0+ dataset ships. It errors loudly instead, naming the missing field and the upgrade path — the smaller, honest option over a plausible-looking guess.

### Sequential / diverging ramps

Sequential and diverging ramps are **not** shipped as tokens — a fixed `--color-viz-seq-N` token set would misrepresent them, because a ramp's *step count* is dataset-defined (6-8, whatever the source theme carries) and a specific ramp is chosen per-use (a heatmap's sequential scale, a signed-difference chart's diverging scale), not once per theme like a categorical identity slot. Two ways to consume them:

1. **Direct JSON consumption** — read the dataset's `dataviz.sequential`/`dataviz.diverging` arrays straight from the installed package:
   ```js
   const { sequential, diverging } = require('@williamzujkowski/oklch-terminal-themes/themes/remarque-light.json').dataviz;
   ```
   Each entry carries `oklch` (structured `{l, c, h}`) and `oklchCss` (a ready-to-use `oklch(...)` string) — no parsing required.
2. **`remarque-theme --dataviz`** — emits `--viz-sequential-1..N` and `--viz-diverging-1..N` custom properties (`N` = the source theme's own ramp length) alongside the normal derived palette. Gamut-clamped but **not** contrast-solved (a sequential ramp's low end is designed to sit near `--color-bg`; solving it to a contrast floor would defeat the ramp) — advisory output, not audited or golden-gated like `--color-viz-1..6`. A future `remarque-audit --json`/`remarque-theme --json` could expose the same arrays as structured output; today, `--dataviz`'s CSS-property emission and direct JSON consumption above cover the need.

### Color-vision robustness: opt-in recipes (0.30, #128)

Since 0.28, `remarque-audit` warns when the categorical slots are hard to tell apart under simulated color-vision deficiency, and the default palette triggers it. The six slots span only 0.042 L (light) and 0.029 L (dark), so hue is their only channel, and the worst pair under simulation is ΔE2000 3.5 (light, deuteranopia) and 2.7 (dark, protanopia); below about 5, marks blur together. **The defaults stay as they are** (ratified 7–0, `vote-1792892374374-55pw50q`): a value change would recolor every consumer's charts, no consumer has asked, and the defaults are pinned to the upstream `oklch-terminal-themes` palettes by the golden gate. The "never color alone" rule above (labels, markers, dash patterns) is what keeps a default-palette chart readable.

If your charts lean on color, override the slots with this **lightness ladder**: same hues and chroma, lightness alternated so that neighbouring slots differ in both hue and lightness. Every slot clears 3.4:1 on `--color-bg` and `--color-surface`. It is a palette-tier override, so `remarque-drift` reports it as INFO, and it's verified by the same coherence math the audit uses:

| Slot | Light | Dark |
|---|---|---|
| `--color-viz-1` | `oklch(0.46 0.121 250.5)` | `oklch(0.72 0.129 249.5)` |
| `--color-viz-2` | `oklch(0.61 0.111 85.5)` | `oklch(0.88 0.13 85.3)` |
| `--color-viz-3` | `oklch(0.52 0.12 24.6)` | `oklch(0.56 0.129 310.2)` |
| `--color-viz-4` | `oklch(0.40 0.12 144.8)` | `oklch(0.72 0.129 25.4)` |
| `--color-viz-5` | `oklch(0.61 0.121 309.6)` | `oklch(0.56 0.129 144.9)` |
| `--color-viz-6` | `oklch(0.55 0.09 195.8)` | `oklch(0.88 0.119 194.8)` |

The worst pair under normal, protan, deutan and tritan simulation rises to **ΔE2000 11.7 (light) and 13.6 (dark)**. The lightness alternates rather than ramps, so the series don't read as an ordered scale; keep it that way if you reorder them. The trade-off is that the lightest slots read as brighter marks than the rest. Run against the audit, the recipe clears every `viz-cvd-*` warning; `accent-vs-viz-1` still warns, because viz-1 keeps the accent's hue (rotate it if links sit next to your charts).

**Dark tertiary text.** Dark `--color-muted` (L 0.60) passes WCAG 2.x at 4.92:1 on `--color-bg`, but the advisory APCA column measures it at Lc −34.5, about half its light twin's 70.0. `--color-muted: oklch(0.64 0.01 80)` in your dark block gives 5.77:1 on bg, 5.49:1 on surface, and Lc −40.3; it moves muted closer to `--color-fg-muted` (0.70), so check the audit's text-tier warnings after.

**When the defaults change.** Revisit when a consumer asks, or when the coherence warnings are promoted to failures (the default palette would then fail its own audit). The change then goes through an upstream `oklch-terminal-themes` release first and a pin bump here, so the golden gate stays exact; never as a per-token exception in the golden gate.

---

## Syntax Highlighting

Code blocks are a first-class Remarque surface, not a place to reach for a vendor Shiki/Prism theme: `tokens-palette.css` defines 9 `--color-syntax-*` slots, hand-authored in both themes and golden-gated against the upstream `remarque-light`/`remarque-dark` themes' ANSI colors the same way the rest of the default palette is (issue #53). Because they are ordinary palette-tier tokens, they inherit palette swaps and theme-deck runtime switches for free — a vendor theme never does.

### Slots

| Slot | Shiki (`createCssVariablesTheme`) | Prism |
|---|---|---|
| `--color-syntax-keyword` | `token-keyword` | `.keyword`, `.atrule` |
| `--color-syntax-string` | `token-string` + `token-string-expression` (aliased — regex/template/interpolated are string-like) | `.string`, `.char`, `.attr-value` |
| `--color-syntax-constant` | `token-constant` | `.number`, `.boolean`, `.constant`, `.symbol` |
| `--color-syntax-comment` | `token-comment` | `.comment`, `.prolog`, `.doctype`, `.cdata` |
| `--color-syntax-function` | `token-function` | `.function` |
| `--color-syntax-type` | (same Shiki variable as `function` — see divergence below) | `.class-name` |
| `--color-syntax-punctuation` | `token-punctuation` | `.operator`, `.punctuation` |
| `--color-syntax-variable` | `token-parameter` | `.variable`, `.property`, `.tag`, `.attr-name` |
| `--color-syntax-link` | `token-link` | `.url` |

Slot names were validated against Shiki's `theme-css-variables.ts` and Prism's reference-theme token vocabulary before being frozen (panel condition on #53) — every name above maps to a real token both highlighters actually emit.

### Derivation

`remarque-theme` derives all 9 slots from the source theme's 16 ANSI colors — the same keep-if-passing-else-solve pattern as every other slot, targeted at `--color-code-bg` (not `--color-bg`) at 4.5:1: `keyword`←blue, `string`←green, `constant`←yellow (the terminal convention for numbers/booleans), `function`←purple, `type`←cyan, `comment`←`brightBlack` in dark themes (solved to a muted neutral on the theme's own fg hue in light themes, where `brightBlack` is often too pale to clear 4.5:1 on `code-bg`), `punctuation`←a derived neutral in the muted family, `variable`←the theme's own fg hue/chroma with a slight lightness offset, and `link`←the already-derived accent triple, aliased with `var(--color-accent)` when it clears 4.5:1 on `code-bg` (solved standalone when it doesn't — accent's guarantee is against `--color-bg`, and `code-bg` sits close enough to drift below the line on some corpus themes). Chroma is capped at 0.14, the same ceiling as `--color-accent`, so syntax colors stay in the system's quiet, one-accent register. `scripts/palette-golden.mjs` extends its ΔE2000 ≤ 2.0 gate to all 9 slots, exactly like the rest of the default palette.

### Astro / Shiki wiring

Shiki v1+ ships `createCssVariablesTheme` — pass it as an object, not the `'css-variables'` string (Astro renames the string form's variable prefix to `--astro-code-*`, which silently breaks the mapping):

```js
import { createCssVariablesTheme } from 'shiki'; // or '@shikijs/core'

const theme = createCssVariablesTheme({
  name: 'remarque',
  variablePrefix: '--color-syntax-',
  fontStyle: true,
});

// markdown/MDX: { shikiConfig: { theme } }
// <Code> component: <Code code={...} lang="..." theme={theme} />
```

**The CSS bridge (required, not optional):** `createCssVariablesTheme`'s `variablePrefix` is a plain string prepend, not a rename — Shiki's own internal slot names already start with `token-` (`token-keyword`, `token-string-expression`, `token-constant`, …) plus a bare `foreground`/`background`, so `variablePrefix: '--color-syntax-'` makes Shiki bake `color:var(--color-syntax-token-keyword)` into every span, not `var(--color-syntax-keyword)`. Left undefined, that variable resolves to nothing and the span silently inherits its parent's color — the highlighting looks like it's missing, not broken. One small bridge block closes the gap (Astro's Shiki integration puts an `.astro-code` class on the `<pre>`; scope to it so these implementation-detail names don't leak into the page's global custom-property namespace):

```css
.astro-code {
  --color-syntax-foreground: var(--color-code-fg);
  --color-syntax-background: var(--color-code-bg);
  --color-syntax-token-keyword: var(--color-syntax-keyword);
  --color-syntax-token-string: var(--color-syntax-string);
  --color-syntax-token-string-expression: var(--color-syntax-string);
  --color-syntax-token-constant: var(--color-syntax-constant);
  --color-syntax-token-comment: var(--color-syntax-comment);
  --color-syntax-token-function: var(--color-syntax-function);
  --color-syntax-token-parameter: var(--color-syntax-variable);
  --color-syntax-token-punctuation: var(--color-syntax-punctuation);
  --color-syntax-token-link: var(--color-syntax-link);
  /* token-inserted/-deleted/-changed intentionally left undefined —
     diff markers, out of scope (see "Documented divergences" below);
     they fall back to inherited foreground, which is a safe default. */
}
```

There is no separate `token-type` — see the `type` ≡ `function` divergence below; `--color-syntax-type` is real for Prism but never appears as a Shiki variable.

### Prism CSS mapping

Prism ships no CSS-variables mode — wire the classes directly:

```css
.token.keyword,
.token.atrule            { color: var(--color-syntax-keyword); }
.token.string,
.token.char,
.token.attr-value        { color: var(--color-syntax-string); }
.token.number,
.token.boolean,
.token.constant,
.token.symbol            { color: var(--color-syntax-constant); }
.token.comment,
.token.prolog,
.token.doctype,
.token.cdata             { color: var(--color-syntax-comment); }
.token.function          { color: var(--color-syntax-function); }
.token.class-name        { color: var(--color-syntax-type); }
.token.operator,
.token.punctuation       { color: var(--color-syntax-punctuation); }
.token.variable,
.token.property,
.token.tag,
.token.attr-name         { color: var(--color-syntax-variable); }
.token.url               { color: var(--color-syntax-link); }
```

### Documented divergences

These are deliberate, not bugs:

- **`type` ≡ `function` under Shiki.** Shiki's css-variables mode folds `entity.name.type` into the function-scoped variable, so the two slots render identically in Shiki output even though Prism (`.class-name` vs. `.function`) distinguishes them. The tokens stay separate because Prism needs them separate.
- **Plain operators inherit the foreground.** Shiki has no scope for a bare operator token; it renders in `--color-fg` like surrounding text rather than `--color-syntax-punctuation`. Prism's `.operator` class does map to punctuation.
- **Diff markers are out of scope.** `token-inserted`/`token-deleted`/`token-changed` (Shiki) and equivalent Prism diff classes are not covered by this token set — a future `--color-diff-*` family would own them if a concrete consumer needs one.

### Comment-contrast policy

The 4.5:1 floor is held, not relaxed, for `--color-syntax-comment` — muted comments are an editorial convention, not a license to fail AA. Survey of shipping syntax themes: GitHub's light-default theme holds 4.55:1, GitHub's dark-default holds 6.15:1, and VS Code's Dark+ holds 5.0:1 — all pass. Only legacy/neglected themes fail (Prism's own default theme sits at 3.64:1; the legacy `github-dark` theme sits at 3.05:1). A muted-comment convention is achievable within AA; Remarque does not carry a documented exception for this slot.

---

## Motion Rules

Motion in Remarque is nearly invisible. The only permitted motion:

- **Hover states** on interactive elements (links, buttons, nav items): `--motion-fast` (120ms)
- **Theme transitions** (light/dark switch): `--motion-normal` (180ms)
- **Focus ring appearance**: `--motion-fast` (120ms)

**Explicitly prohibited:**
- Scroll-triggered animations
- Entrance/reveal animations
- Staggered load sequences
- Parallax effects
- Any animation on non-interactive elements

**Reduced motion:** all motion must respect `prefers-reduced-motion` ([WCAG 2.3.3](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)). Because every sanctioned transition uses the two duration tokens, tokens.css zeroes `--motion-fast`/`--motion-normal` under `prefers-reduced-motion: reduce` — motion authored with the tokens is automatically safe. Never hardcode durations; any future opt-in animation must live inside a `(prefers-reduced-motion: no-preference)` query.

---

## Stacking

Stacking order is structural, not personalization — `tokens-core.css` (CORE tier, never overridden) carries a small ordinal `--z-*` scale:

| Token | Value | Use for |
|---|---:|---|
| `--z-base` | 0 | Default stacking context — the implicit baseline |
| `--z-sticky` | 10 | Sticky headers/rails (essay.css's TOC rail) |
| `--z-dropdown` | 20 | Dropdown/select menus |
| `--z-overlay` | 30 | Overlays/backdrops |
| `--z-modal` | 40 | Modal dialogs |
| `--z-toast` | 50 | Toast/notification stacks |
| `--z-skip-link` | 60 | The skip-to-content link — tops everything; it must never be obscured when focused |

**The rule: never a bare `z-index` number in consumer CSS.** Reference one of these seven tokens instead — an unnamed `z-index: 999` (or any other asserted integer) can't be reasoned about against the rest of the page's stacking contexts, and it's the same "hardcoded value bypasses the token system" problem as a literal hex color or a bare font-size. The scale is deliberately sparse (gaps of 10) so a future layer can be inserted between two existing rungs without renumbering everything above it.

Tailwind v4 ships `z-*` as a static, non-themable utility scale — there's no `--z-index-*` entry in its default `@theme` to map these into. `theme.css` (the Tailwind v4 adapter) documents the workaround in its header comment: use arbitrary values with the tokens, `z-[var(--z-modal)]` / `focus:z-[var(--z-skip-link)]`, the same pattern already used for motion durations (`duration-[var(--motion-fast)]`).

---

## USWDS Accessibility Compliance

Remarque adopts typography and accessibility standards from the [US Web Design System (USWDS)](https://designsystem.digital.gov/documentation/accessibility/) and [WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/) (Level AA; a superset of 2.1 AA, so 2.1 consumers are covered):

### Font Size Floors

| Token | Value | USWDS Rationale |
|-------|-------|-----------------|
| `--text-body` | 17px (1.0625rem) | Exceeds [USWDS 16px minimum](https://designsystem.digital.gov/components/typography/). Non-negotiable floor. |
| `--text-meta` | 14px (0.875rem) | USWDS minimum for small text. Used sparingly for metadata, labels, captions. |
| `--text-micro` | 13px (0.8125rem) | USWDS floor for timestamps and fine print only. Never for body content. |

### Contrast Ratios (WCAG 2.2 AA)

| Pairing | Requirement | Notes |
|---------|-------------|-------|
| Normal text on background | 4.5:1 minimum | [WCAG 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) — all text below 24px regular / 18.5px bold. Applies on `--color-surface` too, not just `--color-bg` |
| Large text on background | 3:1 minimum | [WCAG 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) — display and title text (24px+) |
| Functional non-text elements | 3:1 minimum | [WCAG 1.4.11](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html) — use `--color-border-bold` (meets 3:1). `--color-border` is decorative-only by design and exempt; never the sole boundary of an interactive element |

### Touch Targets

All interactive elements (links, buttons, inputs) must have a minimum touch target of **44x44px**. That satisfies [WCAG 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) (AA, 24x24px) with margin and also meets the stricter [2.5.5 Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) (AAA, 44x44px) and the USWDS floor. This applies to nav links, theme toggles, footer links, chips, and any clickable element.

### WCAG 2.2 AA Criterion Map

Remarque already meets most of WCAG 2.2 AA by construction. Each row names the mechanism and what fails the build if it regresses. Pointers are to shipped CSS and the demo's Playwright suite (`site/tests/`).

| SC | Remarque's mechanism | Enforced by |
|---|---|---|
| 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast | Palette tiers verified at 4.5:1 text / 3:1 functional borders and dataviz marks; `--color-border` decorative only | `npm run audit` (`scripts/audit.mjs`); axe `color-contrast` in `site/tests/a11y.spec.ts` |
| 2.4.7 Focus Visible, 2.4.13 Focus Appearance (AAA, exceeded) | Global `:focus-visible` 2px outline, 2px offset (`tokens-core.css`, "Focus Styles"); `outline-color: Highlight` under forced-colors | `forced-colors.spec.ts` focus-ring assertions |
| 2.4.11 Focus Not Obscured (Minimum) | No sticky/fixed chrome ships; the essay TOC rail sticks in its own column, never over the reading column. **Consumers:** any sticky or fixed header/footer you add needs a matching `scroll-padding-top` (or `scroll-padding-bottom`) on `html` so focused elements are not hidden behind it | Convention (AGENT_RULES bans sticky headers); not machine-checked |
| 2.5.8 Target Size (Minimum) | 44px floor on every interactive element (`forms.css` `.remarque-input`, checkbox/radio label, `.remarque-button`; `essay.css` TOC links; demo `.nav-link`) | `computed-style.spec.ts` "interactive target size (>= 44x44 CSS px)"; axe `target-size` |
| 1.4.10 Reflow, 1.4.12 Text Spacing | Measure and spacing authored in relative units (`rem`/`ch`/`em`), unitless line-heights; `overflow-wrap: break-word` on `html`, `anywhere` on flex labels; `<pre>` and wide tables scroll in their own box | `site/tests/reflow.spec.ts`: every demo page at 320px, long-string fixtures in prose, broadsheet titles, forms and the TOC rail, and the 1.4.12 override set with no clipped controls |
| 3.3.7 Redundant Entry, 3.3.8 Accessible Authentication (Minimum) | Forms contract: known-personal-data inputs carry a valid `autocomplete` token; paste is never blocked (see "Forms") | Convention + review (AGENT_RULES forms line) |
| 3.2.6 Consistent Help | Consumer concern: if a page offers help (contact, chat, FAQ link), place it in the same relative position on every page | Consumer review |
| 1.3.1, 4.1.2 (ARIA contracts) | Registry markup contracts: sidenote `aria-describedby`, TOC `aria-label`, forms `aria-describedby`/`aria-invalid` | axe on every demo page, both themes, plus a forced-colors pass |
| 4.1.1 Parsing | **Removed in WCAG 2.2** (obsolete; browsers handle parsing errors uniformly). Nothing to enforce | n/a |

axe-core catches only the machine-checkable subset of WCAG; it complements the computed-style and forced-colors suites rather than replacing manual review.

### Regulatory Context

[EN 301 549](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/) V4.1.1 (published 2026-09-02) is the EU harmonised standard behind the European Accessibility Act (EAA). It moves the web clauses from WCAG 2.1 AA to WCAG 2.2 AA and adds EAA mapping annexes. Until the Commission cites V4.1.1 in the Official Journal of the EU, V3.2.1 (WCAG 2.1 AA) remains the presumption-of-conformity baseline; because 2.2 AA is a superset, a Remarque page that meets 2.2 AA meets both. US Section 508 references WCAG 2.0 A/AA, which this section exceeds. Remarque is a styling layer: conformance claims about a whole site (content, captions, authored alt text, 3.2.6 help placement) remain the consumer's.

### Line Height

| Context | Minimum | Remarque Value |
|---------|---------|----------------|
| Body text (running copy) | 1.5 | 1.75 |
| Meta/caption text | 1.35 | 1.5 |
| Display/heading text | 1.0 | 1.05-1.2 |

### Forced Colors & Contrast Preferences

Issue #93 — Remarque cites [USWDS](https://designsystem.digital.gov/documentation/accessibility/) as its accessibility lineage but had, until this section, adopted none of USWDS's forced-colors work (their `$high-contrast-system-colors` map + `@media (forced-colors: active)` rules on nearly every component). Windows High Contrast Mode (`forced-colors: active`) replaces most author-specified `color`/`background-color`/`border-color`/`outline-color` with a small system palette at paint time — the exact signals a typography-first system leans on (`--color-border`'s documented sub-3:1 decorative hairlines, border-only hover states, `-subtle` tinted backgrounds) are the ones color-only affordances rely on, and forced-colors is precisely the mode that strips them.

**The audit, and what it found.** Every color-bearing declaration across `tokens-core.css`, `prose.css`, `essay.css`, `broadsheet.css`, `forms.css`, `theme.css`, and the demo's own `globals.css`/`tokens.astro` was classified into one of three buckets:

1. **Fine as-is** — the overwhelming majority. `forced-colors: active` forces `border-color` to a visible system border color for any non-transparent, non-zero-width border, REGARDLESS of the authored value — so every hairline built the ordinary way (table `border-bottom`, `hr`, `.remarque-sidenote`'s `border-inline-start`, `.remarque-toc-rail summary`'s `border-bottom`, `dl`/`details`' `border-top`, `img`/`kbd`'s `border`, the pullquote's rules) already renders correctly with zero code changes. This is exactly the mechanism that "fixes" `--color-border`'s documented sub-3:1 contrast for free: the decorative token was never load-bearing under forced-colors to begin with. `::selection`'s `background-color`/`color` are likewise forced to the system `Highlight`/`HighlightText` pair automatically, same as any native text selection. `--color-syntax-*`'s nine-slot rainbow collapses to one uniform system text color — accepted, not fixed: the code's structure and whitespace carry meaning independent of the syntax coloring, and `forced-color-adjust: none` here would mean trusting our authored syntax palette to stay legible against an *unknown* system high-contrast background, which is not a bet this system should make on a user's behalf. `.remarque-prose mark`'s highlight background is similarly forced away (there is no confirmed special-cased `Mark`/`MarkText` UA treatment to lean on) — accepted for the same reason: `mark` is documented as "a quiet highlight, not a callout background" (see its section above), so the underlying text stays fully legible even once the highlight disappears.
2. **Affordance-loss — fixed.** Three concrete cases where color genuinely was the only signal:
   - **Broadsheet title-link hover/focus** (`broadsheet.css`, `.remarque-lead-title a` / `.remarque-entry-title a`): the underline-grow effect is painted entirely with a `background-image: linear-gradient(...)` — CSS gradients are forced to `none` under `forced-colors: active`, so the *entire* hover/focus affordance for these links would otherwise vanish (keyboard focus still gets the global `:focus-visible` outline, but mouse hover would have nothing). Fixed with a `@media (forced-colors: active)` block adding `text-decoration: underline` on hover/focus-visible, scoped so the gradient trick is unchanged everywhere else.
   - **Form validation states** (`forms.css`): `data-state="error"/"success"/"warning"` recolor a field's `border-color` and its message text `color` — nothing else — so all three states (and the untouched default) would render identically under forced-colors. Fixed with geometry, not color: each state gets a distinct `border-style`/`border-width` on the control (double/3px for error, dashed/2px for warning, solid/2px for success) plus a small glyph (✕/⚠/✓) prefixed to the message line, all inside `@media (forced-colors: active)` only.
   - **`.remarque-rule`** (`broadsheet.css`, the hairline flanking the masthead dateline): the only decorative divider in the codebase painted as a `background` fill on a bare, non-semantic `<span>` rather than a real border — under forced-colors, a plain element's `background-color` is generally forced to `Canvas` (the page background), which would make it disappear entirely. Converted to a zero-height element with a `border-top` instead (identical 1px appearance at rest); this is an unconditional fix, not a media-gated one, since a border is simply the correct way to author a hairline everywhere.
   - Also extended to the demo site's own chrome (not shipped in the package, but audited the same way): `.nav-link`/`.footer-link` hover and `.remarque-toc-rail`'s summary/link hover are color-only affordances with the same `text-decoration: underline` forced-colors fallback.
3. **Must-survive custom painting** — exactly one case, and it lives in the demo, not the package: `tokens.astro`'s color-token reference swatches (`.remarque-color-swatch`, `site/src/styles/globals.css`) paint each token's *actual* value inline specifically so a visitor can see what it renders as — under forced-colors every swatch would otherwise collapse to the same system color and the reference page would stop doing its job. `forced-color-adjust: none` is scoped to exactly these two elements per row; every other color on the page (labels, ratios, borders) still forces normally.

**Focus.** `:focus-visible` (`tokens-core.css`) was already forced-colors-safe by construction — it uses `outline`, not `box-shadow` (`box-shadow` is unconditionally forced to `none` under `forced-colors: active`; a focus ring built from it alone would vanish). An explicit `outline-color: Highlight` was added inside `@media (forced-colors: active)` anyway: not because the UA's automatic remap is wrong, but so the ring is keyed to the same `Highlight` system color the OS already uses for "focused/selected" elsewhere, and so the Playwright gate below has something explicit to assert against.

**`prefers-contrast: more`.** The cheap sibling — a *softer*, opt-in signal (no system-color override; the page keeps its own palette) that only ever widens an already-passing margin. Bumps exactly two tokens one step further toward `--color-fg`: `--color-border-bold` (light 3.39:1 → 4.52:1, dark 3.23:1 → 4.53:1) and `--color-fg-muted` (light 7.55:1 → 10.11:1, dark 7.26:1 → 9.70:1). `--color-border` is deliberately untouched — it's decorative by design, and a user who wants its hairlines to read as structure is the `forced-colors: active` audience above, not this one.

- **Architectural home:** `tokens-palette.css`, immediately after the theme-selection mechanism — these are `--color-*` values, palette tier by the Token Tiers contract, the same tier the base `light-dark()`/`color-scheme` regime already lives in.
- **Simplified to one block under `light-dark()` (0.24.0, issue #95):** pre-migration this needed a plain `:root` override, a `[data-theme="dark"], :root.dark` override, and a compound `@media (prefers-contrast: more) and (prefers-color-scheme: dark)` override — three copies of two tokens, covering system-default, explicit-dark, and system-dark-without-an-explicit-choice respectively. A single un-scoped `light-dark(<light>, <dark>)` override per token now replaces its whole value at once and re-resolves per element from whatever `color-scheme` is already active there (system, explicit, or the `:root.dark` bridge) — see "Color Scheme & light-dark()".
- **Audit-parser compatibility:** `scripts/lib/css-tokens.mjs`'s `isLightRoot` filter requires an empty at-rule context — a `@media (prefers-contrast: more)` block's context is that at-rule itself, so it matches neither `isLightRoot` nor `isDarkBlock`, and `scripts/audit.mjs`/`scripts/tokens-json.mjs` silently skip these declarations, unchanged from before the light-dark() migration. That's still correct: the block only ever strictly improves an already-passing contrast margin, so there is nothing for the automated gate to enforce beyond what the base palette already guarantees. The values are still hand-verified in-gamut and re-computed with the same OKLCH → sRGB → WCAG luminance math `scripts/audit.mjs` uses (see the ratios in `tokens-palette.css`'s comment).

**CI gate.** `site/tests/forced-colors.spec.ts` runs Chromium with `page.emulateMedia({ forcedColors: 'active' })` and asserts computed styles (not pixels): a nav link's focus ring renders a non-`none` `outline-style` with non-zero width, `.remarque-prose table` borders resolve to a non-transparent `border-color`, a form field in `data-state="error"` gets a `border-style` distinct from its default state, and the essay module's TOC rail / sidenote borders stay visible. Wired into the existing `visual-regression.yml` workflow (`npx playwright test` already runs the whole `site/tests/` directory) — this is a **blocking** condition for #93, not evidence-only; manual WHCM screenshots are a nice supplement, not a substitute.

### Changing the Accent Hue

The accent is the single sanctioned expressive color. To personalize it, keep the **lightness** values from the default palette (lightness carries the contrast; hue carries the personality) and change hue/chroma:

1. Re-derive all accent-family tokens at the same lightness steps: `--color-accent` (0.50 light / 0.68 dark), `--color-accent-hover` (0.42 / 0.75), `--color-accent-subtle` (0.95 / 0.22), `--color-selection-bg` (0.92 / 0.30).
2. Reduce chroma until every value is inside the sRGB gamut — the audit rejects out-of-gamut colors because browsers clip them, so the authored value is not what renders. Different hues tolerate very different chroma at the same lightness (blues carry 0.14 at L 0.50; yellows and cyans will not).
3. Run `npm run audit` (or, in a consumer project, `npx remarque-audit --palette your-palette.css --src src`). Accent and accent-hover must reach 4.5:1 on `--color-bg` in both themes. The audit is the gate — not every hue passes at every lightness, and the checklist wins over the hue.

### Enforcement Checklist

Every PR that ships Remarque pages MUST pass (`npm run audit` automates the color/size lines):

- [ ] Body copy ≥ 17px (`var(--text-body)`). No hardcoded smaller sizes.
- [ ] Small text ≥ 14px (`var(--text-meta)`). Micro text (`--text-micro` / 13px) only for timestamps.
- [ ] `--color-muted` contrast ≥ 4.5:1 against `--color-bg` **and** `--color-surface` in both themes.
- [ ] `--color-fg-muted` contrast ≥ 7:1 (AAA) for body-adjacent prose.
- [ ] All transitions use `--motion-fast`/`--motion-normal` tokens (reduced-motion support depends on it).
- [ ] Every interactive element is ≥ 44×44px (use min-height/padding, not font-size to reach the floor). Meets WCAG 2.5.8 AA (24px) and 2.5.5 AAA.
- [ ] Any consumer sticky/fixed chrome has a matching `scroll-padding-top`/`-bottom` so focus is never obscured (WCAG 2.4.11).
- [ ] Inputs collecting known personal data carry a valid `autocomplete` token and never block paste (WCAG 3.3.7, 3.3.8).
- [ ] `cd site && npx playwright test tests/a11y.spec.ts` passes: axe-core, WCAG 2.0–2.2 A/AA tags, no serious/critical violations on any demo page in either theme.
- [ ] `font-variant-numeric: tabular-nums lining-nums` on all metadata that mixes with dates/counts.
- [ ] No hardcoded hex/rgb colors — only `var(--color-*)` tokens.
- [ ] Body line-height ≥ 1.5 (Remarque target: 1.75).
- [ ] Every `--color-syntax-*` slot ≥ 4.5:1 against `--color-code-bg` in both themes (see "Syntax Highlighting").
- [ ] Every `--color-error`/`--color-success`/`--color-warning`/`--color-disabled` ≥ 4.5:1 against `--color-bg` **and** `--color-surface` in both themes; every `-subtle` background keeps `--color-fg` ≥ 4.5:1 on it (see "State Colors"). State colors used only for feedback moments, never decoration.
- [ ] Every `--color-viz-*` slot ≥ 3:1 against `--color-bg` in both themes (see "Dataviz Tokens") — the mark-on-background line, not text's 4.5:1. Never used as the sole distinguisher between series — pair with a non-color redundancy (shape, pattern, or a direct label).
- [ ] No bare `z-index` number in consumer CSS — reference `tokens-core.css`'s `--z-*` scale (see "Stacking").
- [ ] Any new color-only affordance (hover/focus signal, state indicator, structural divider) is checked against forced-colors mode — does it survive, or does it need a `@media (forced-colors: active)` fallback? (see "Forced Colors & Contrast Preferences")

Agents reviewing PRs should reject changes that violate any line above without explicit rationale.

### Palette Coherence (warnings, issue #125)

Contrast floors say each color is readable; they do not say the roles that must look *different* actually do. `remarque-audit` therefore also checks palette **coherence**, as **warnings** in this release (they print in the human output and appear in `--json` under `warnings`; they never change `passed` or the exit code). They are scheduled to be promoted to failures in a later minor. CIEDE2000 (ΔE) is computed on the sRGB-rendered color; "under protan/deutan/tritan" means after a Machado et al. 2009 severity-1.0 simulation (the same matrices as culori's `filterDeficiencyProt/Deuter/Trit`). All thresholds live in one block, `THRESHOLDS` in `scripts/lib/palette-coherence.mjs`.

| Rule (id) | Warns when | Why |
|---|---|---|
| Monotonic text tiers (`text-tier-monotonic`) | contrast(`fg`) < contrast(`fg-muted`), or contrast(`fg-muted`) < contrast(`muted`), against `bg` | Primary text must never be fainter than secondary (rose-pine light had fg 7.42:1 under fg-muted 7.52:1). |
| Accent vs body text (`accent-vs-fg`) | accent/fg < 3:1 **and** ΔE < 15 | A link must differ from body text by value or by hue; hue alone at ~1:1 is invisible. |
| Accent vs error (`accent-vs-error`) | ΔE < 8 | A link and an error message must not be the same color (gruvbox shipped accent == error). |
| Accent vs chart 1 (`accent-vs-viz-1`) | ΔE < 8 | Enforces "chart color is never mistaken for the system's one interactive signal" (see "Dataviz Tokens"). |
| Error vs success (`error-vs-success-deutan`) | ΔE < 5 under deuteranopia | The red/green state pair is the classic CVD collapse. |
| Surface ramp (`surface-step`) | any adjacent step in `bg` → `surface` → `bg-subtle` → `code-bg` has ΔE < 3 (the warning names the pair) | Redundant surfaces are noise; separate the steps or drop the token. |
| Viz under CVD (`viz-cvd-normal/protan/deutan/tritan`) | minimum pairwise ΔE across `--color-viz-1..6` < 5 under that vision | ~5 is where marks become confusable. The six slots differ mostly by hue, so below this "never color alone" is the only thing separating series: label directly, or vary marker/dash. |

`remarque-theme` applies the accent guards as generation constraints: when the default accent source lands within ΔE 8 of the derived `--color-error`, or indistinguishable from `--color-fg`, in either theme, it rotates to the nearest-hue other chromatic ANSI color that clears both (and says so on stderr); it also keeps `fg` at least as high-contrast as `fg-muted`. Generated palettes therefore never emit `accent-vs-error` or `text-tier-monotonic`. The viz/surface rules are not generator guards: viz comes from the dataset's categorical block, and the surface ramp is the fixed offsets above.

### APCA: Considered, Not Adopted (2026-07-23)

APCA (Accessible Perceptual Contrast Algorithm) was pulled into the WCAG3 working draft in 2023 and remains exploratory — no ratified conformance model specifies it, and that status is unchanged as of this writing. Remarque holds **WCAG 2.x's ratio-based contrast** as the enforcement gate (see "Contrast Ratios" above and the Enforcement Checklist) rather than building the audit toward an unratified algorithm.

This is a deliberate policy/data split, not an oversight: the upstream `@williamzujkowski/oklch-terminal-themes` dataset is adding APCA Lc values as *data* on its themes (oklch-terminal-themes#151) — a reasonable thing for a dataset to expose so consumers can experiment. Remarque's own audit gate does not consume it. Data availability and policy adoption are two different questions, and this project is only answering one of them right now.

**Revisit trigger:** a ratified WCAG3 conformance model that specifies an actual APCA (or successor) algorithm and threshold set. Until then, this is dated rather than re-litigated on every PR that mentions contrast.

---

## Lineage: Butterick's Five Rules

Remarque's core values descend from Matthew Butterick's [*Typography in
Ten Minutes*](https://practicaltypography.com/typography-in-ten-minutes.html)
(an acknowledged inspiration). The mapping, including where and why we
deviate — values below are asserted against `tokens.json` in CI:

| Butterick rule | His guidance | Remarque | Status |
|---|---|---|---|
| 1. Body text first | Typographic quality is determined largely by body text | AGENT_RULES.md Build Order steps 1–4 are tokens → typography → shell → prose, before any component | Aligned by construction |
| 2. Point size | 15–25 px on the web | `--text-body: 1.0625rem` (17px); lead paragraphs `--text-body-lg: 1.1875rem` (19px) | Aligned |
| 3. Line spacing | 120–145% of point size | `--leading-body: 1.75` (175%) | **Deliberate deviation** — see below |
| 4. Line length | 45–90 characters per line | `--content-reading: 38rem` ≈ 71 measured characters (median, p90 76) at 17px Inter; the measure-compensation table targets a 66–72 median for every approved body face | Aligned |
| 5. Font choice | Professional fonts, never default system faces | Newsreader (Production Type), Inter (Rasmus Andersson), JetBrains Mono — professionally designed, self-hosted | Aligned in spirit: these are free but professional-grade faces; Butterick's stricter preference is paid fonts |

### The line-spacing deviation, argued

Remarque's 175% body leading sits **outside Butterick's 120–145% range,
at the airy extreme of quality web practice (commonly 150–165%)**. We
own that plainly rather than argue it away. The reasons it is a
deliberate identity choice, not an oversight:

1. **Leading scales with measure.** Classic guidance ties looser leading
   to longer lines; Remarque's ~70 ch measure sits in the upper-middle
   of Butterick's own 45–90 ch range, and screen prose at 17px benefits
   from more air than his print-derived band.
2. **Token-hierarchy coherence.** Literal conformance (≤145%) would put
   body leading *below* `--leading-meta: 1.5` — which is pinned by the
   USWDS/WCAG floors this spec also adopts. Body text reading tighter
   than caption text is not a hierarchy this system will ship.
3. **Identity.** "Generous — this is what makes prose readable" predates
   this audit; the spacious register is part of what makes a Remarque
   page recognizable (see Signature Moves).

The trade-off is real: 1.75 spends more vertical space and reads calmer
and slower than 1.5–1.65. Sites wanting Butterick-tighter rhythm are
choosing a different identity — that is a fork, and an honorable one,
but it is not Remarque. (Ratified 3–0 by design-review panel, 2026-07-20,
over the alternative of changing the token.)

---

## Decision Order

When multiple design options are possible, choose in this order:

1. The more **readable** option
2. The more **typographically disciplined** option
3. The **quieter** visual treatment
4. The more **reusable, tokenized** solution
5. The version with **less visual noise**

This order is not a suggestion. It is the tiebreaker for every design decision.

---

## Page Archetypes

Every page built with Remarque must conform to one of these seven archetypes: Essay, Project Dossier, Notebook, Landing, Reference/Docs, Changelog, Gallery. Agents and implementers should not invent new page structures — the last three exist precisely because real downstream projects (tsundoku, and the multi-site review that produced this revision) needed shapes the first four actively fought, and inventing an unsanctioned workaround is worse than extending the vocabulary here.

### Essay

Long-form writing. The core content type.

**Always includes:**
- Large serif title (Newsreader, `--text-display` or `--text-title`)
- Mono metadata row (date, reading time, tags)
- Narrow reading column (`--content-reading`)
- Strong prose styling with generous line height
- Low-noise footer navigation (previous/next)

**Optionally includes:**
- Side table of contents on desktop (outside reading column) — see "Essay Module" below for the sanctioned sticky-rail implementation
- Sidenotes/footnotes as in-flow margin notes — same module, same rail-vs-gutter layout

**Never includes:**
- Sidebar content within the reading column
- More than one accent color
- Inline images wider than the reading column
- Share buttons or social widgets in the content area

### Project Dossier

A project page. Technical, structured, informative.

**Always includes:**
- Serif title + one-paragraph summary
- Mono metadata block (stack, status, dates, links)
- Architecture or stack section
- Decisions/notes section

**Optionally includes:**
- Changelog or updates section
- Related project links
- Screenshots (within image treatment rules)

**Never includes:**
- Marketing language or CTAs
- Feature comparison grids
- Testimonials

### Notebook

Short-form notes, bookmarks, links, observations. The informal content type.

**Always includes:**
- Compact entries with mono timestamps
- Minimal chrome — content-forward
- Consistent entry structure (even if entries vary in length)

**Optionally includes:**
- Tags or categories (mono text, not pill badges)
- Source links

**Never includes:**
- Card-based layouts
- Masonry grids
- Thumbnail images

### Landing

The homepage or entry point. Sets the tone.

**Always includes:**
- A single clear statement of identity (serif, large)
- Navigation to primary content types
- Generous whitespace — the landing page should breathe

**Optionally includes:**
- Recent entries or updates (3–5 max)
- A brief "about" line
- **CLI-tool landing only:** a single mono install command block (styled as prose `<pre>`, copy button allowed) — the one sanctioned interactive element on an otherwise CTA-free page — and an optional `--help`-output figure (follows the Plate convention, see Image Treatment)
- **Editorial/archive landing:** the Broadsheet pattern's masthead + lead article + numbered entry list (own module, `remarque-tokens/broadsheet`) — see "Patterns" below

**Never includes:**
- Hero images or banners
- Multiple CTAs
- Feature grids
- Testimonial carousels
- Newsletter signup forms above the fold

The CLI install block is not a CTA exception in disguise — it is the single piece of information a CLI tool's landing page cannot omit (how do I get this), same status as a book's title. One block, one command, no surrounding marketing copy. A page with an install block *and* a separate "Sign up now" button has smuggled in a second CTA and fails this archetype.

### Reference/Docs

Persistent technical documentation: API references, config guides, multi-page manuals. Reuses the Essay archetype's existing three-column shape (nav rail outside the reading column · reading column · optional desktop ToC outside the reading column) — this is not a new layout engine, only a different left rail.

**Always includes:**
- A persistent left nav rail listing every doc page (mono, quiet, `--text-meta` — a list of links, not a component), sitting outside the reading column exactly like Essay's optional ToC sits outside it on the other side
- A breadcrumb kicker above the title (mono, `--text-meta`, e.g. `Reference / Configuration`)
- Content constrained to `--content-reading`, matching Essay's prose column
- A low-noise prev/next footer nav between adjacent doc pages (mono, matching Essay's footer nav)

**Optionally includes:**
- Tables and code blocks widening past the reading column to `--content-standard` when the content genuinely needs the room (a config reference table, a wide code sample) — the surrounding prose stays at `--content-reading`
- A desktop-only "on this page" ToC, reusing Essay's optional side-ToC convention, on the side opposite the nav rail

**Never includes:**
- Sidebar content mixed *into* the reading column itself (the nav rail is a fourth structural region, not reading-column content — same rule Essay already enforces for its own ToC)
- Card grids for the page listing (the nav rail is a list, not a grid of cards)
- More than one accent color
- CTAs, feature grids, or any Landing-archetype vocabulary

### Changelog

A tool or project's primary log of released changes. Built from the Notebook archetype's entry structure, not a new component: compact, mono-timestamped, content-forward entries, applied to version history instead of notes.

**Always includes:**
- A mono version + date headline per entry (e.g. `0.7.0 — 2026-07-21`) — semver renders as plain mono text, never a colored pill or badge
- Grouped category lists per entry (Added / Changed / Fixed, or whatever categories the project uses), reusing Notebook's compact entry rhythm
- Reverse-chronological order, most recent release first

**Optionally includes:**
- An inline mono link to the relevant issue/PR per line item
- A "compare" or diff link per version, mono, in the entry headline row

**Never includes:**
- Semver rendered as a pill/badge (`.rounded-full` chips, colored status pills) — plain mono text only, same rule as tags elsewhere in the system
- Card-based per-version layout
- Marketing framing of a change ("Exciting new feature!") — changelog prose stays as flat and factual as commit messages

A changelog embedded as an optional subsection of a Project Dossier (already sanctioned) remains valid for short update logs. Promote to the standalone Changelog archetype once the log is long enough, or important enough, to be the page rather than a section of one — typically once a tool ships its own versioned releases.

### Gallery

Cover-grid and catalog pages — a page whose primary content unit is a grid of images with a caption, not prose. None of the other archetypes are shaped for this: they are all fundamentally text/document-shaped. **Reference implementation: [tsundoku](https://github.com/williamzujkowski/tsundoku)**, which needed this shape immediately for its book-catalog `/browse` grid and documented it as an informal fifth archetype in its `DESIGN-NOTES.md` before this spec existed; Gallery formalizes that implementation rather than inventing a new one.

**Always includes:**
- A grid container widened beyond `--content-standard` (72rem) to `--content-wide` (88rem) — Gallery is the only archetype permitted to exceed `--content-standard`, because a grid of cover-aspect thumbnails needs more horizontal room before it feels cramped than an essay or a dossier ever would
- Cover/thumbnail images exempt from the `--content-reading` width cap that Image Treatment otherwise mandates — cover art *is* the content here, not illustrative decoration of prose. Every other Image Treatment rule still applies without exception: 1px `--color-border`, no drop shadow, mono captions
- Grid item hover restricted to a border-color shift only (`--motion-fast`) — no scale, no lift, no shadow growth, matching Motion Rules' general prohibition on attention-seeking animation
- Grid density driven by content (`repeat(auto-fill, minmax(...))` or breakpoint-based column counts), never a fixed card size that fights the image's native aspect ratio

**Optionally includes:**
- Prose-bearing sections within a Gallery page (an "about" blurb, an item description) narrowed back down to `--content-reading` — the widened container serves the grid only, not every element on the page
- Mono captions under each cover (title, author, or other item metadata)

**Never includes:**
- Card shadows or scale/lift-on-hover
- Masonry layouts (Notebook's existing prohibition applies here too — a fixed-ratio grid only)
- The `--content-wide` container used for anything other than the grid itself

---

## Essay Module

An optional pair of Essay-archetype features — margin notes and a sticky
table of contents — shipped as their own subpath, `remarque-tokens/essay`
(`essay.css`), rather than aggregated into `tokens.css` or `prose.css`.
Not every Essay wants either; both are opt-in.

**Provenance.** Graduated from williamzujkowski.github.io's
`rehype-sidenotes.mjs` + `global.css` sidenote/sticky-TOC implementation,
ratified for upstreaming in [issue #52](https://github.com/williamzujkowski/remarque/issues/52)
per the "Graduation" checklist in the package README — a footnote
vocabulary Remarque otherwise entirely lacked (this spec, until now,
permitted a side TOC at line ~499 without specifying anything about it).
No site-specific value was copied; every dimension below is re-derived
from tokens this package already ships (see `essay.css`'s header comment
for the value-by-value mapping).

### Markup contract

<!-- registry-usage:essay — scripts/build-registry.mjs (issue #100) extracts
     the fenced block immediately below into registry/essay.json's
     usage.html verbatim. Keep this the single, hand-authored known-good
     sample — do not fork a second copy for the registry. -->
```html
<article class="remarque-essay">
  <header class="content-reading">
    <h1 class="text-display font-display">Essay Title</h1>
  </header>

  <nav class="remarque-toc-rail" aria-label="Table of contents">
    <details open>
      <summary>On this page</summary>
      <ul>
        <li><a href="#section-one">Section One</a></li>
        <li><a href="#section-two">Section Two</a></li>
      </ul>
    </details>
  </nav>

  <div class="remarque-prose content-reading">
    <h2 id="section-one">Section One</h2>
    <p>
      A claim worth a citation<a href="#note-1" id="note-1-ref"
        class="remarque-sidenote-ref" aria-label="Note 1"
        aria-describedby="note-1"></a>.
    </p>
    <aside class="remarque-sidenote" id="note-1" role="note">
      The note text, in real DOM order right after the paragraph that
      cites it — not collected into an end-of-document section.
    </aside>
  </div>

  <footer class="content-reading">...</footer>
</article>
```

Requirements the CSS depends on:

- `.remarque-sidenote-ref` and its matching `.remarque-sidenote` MUST
  alternate in strict DOM order (ref, then note, then the next ref, then
  its note...) — the module numbers them with CSS counters
  (`counter-reset` on `.remarque-prose`), not an authored number, so an
  out-of-order pair mislabels every note after it.
- A footnote cited more than once: only the FIRST reference gets a
  `.remarque-sidenote` after it; later citations of the same note use
  `.remarque-sidenote-ref--repeat` (styled identically, does not advance
  the counter) so the shared numbering doesn't skip.
- `aria-label="Note N"` on every `.remarque-sidenote-ref`, numbered in
  the same order the CSS counter advances — the ref's visible digit is
  counter-generated, so the anchor itself has no text content, and an
  empty focusable link with no accessible name fails WCAG 4.1.2 / 2.4.4
  (axe: `link-name`). Because both the label and the counter derive from
  DOM order, they cannot drift apart. (Found in the flagship's migration,
  williamzujkowski.github.io#380.)
- `role="note"` on every `.remarque-sidenote` — `<aside>`'s implicit role
  is `complementary`, a landmark; an essay with several notes would
  otherwise scatter that many unlabeled landmark regions through the
  page. `aria-describedby` on the reference (pointing at the note's `id`)
  is optional but recommended.
- `.remarque-toc-rail` wraps a plain `<details open>` — the SAME markup
  at every viewport width, no JS breakpoint listener. `open` by default
  is deliberate (see "Breakpoint behavior" below).

**No build step required, and none shipped.** This module doesn't ship or
depend on a rehype/remark transform — the contract above is satisfied by
hand-authored HTML exactly as well as by a build-time relocation step. If
your pipeline doesn't relocate GFM footnote definitions into DOM order
(most don't, out of the box), style the default end-of-document
`<section data-footnotes>` output with `.remarque-footnotes` instead —
same mono/meta voice, without the DOM-reordering accessibility upgrade:

```html
<section class="remarque-footnotes">
  <h2>Notes</h2>
  <ol>
    <li id="note-1">The note text. <a href="#note-1-ref">&#8617;</a></li>
  </ol>
</section>
```

Use `.remarque-sidenote` whenever you can relocate notes into reading
order — that relocation is the actual accessibility win this module
exists for. `.remarque-footnotes` is a same-voice fallback, not a lesser
tier of support, for the common case where you can't (yet).

### When to use

Essay archetype only (sidenotes/a TOC rail are meaningless outside
long-form prose). Reach for sidenotes on essays with real citations,
asides, or sourcing that would otherwise interrupt the sentence; reach
for the TOC rail on any essay long enough that "where am I" becomes a
real question — roughly the same length threshold Reference/Docs pages
already assume. Both are independent opt-ins: an essay can use one, the
other, both, or neither without violating the archetype.

### Breakpoint behavior

Gated on a single `>= 80rem` (1280px) `@media` query — no other
breakpoint, no JS:

| Viewport | Sidenotes | TOC |
|---|---|---|
| `< 80rem` (narrow) | Small-print block, in-flow, right after the citing paragraph — bordered with `--color-border-bold` (a 3:1 functional border, since it's the note's only visual separator at this width) | Inline collapsible `<details>` in the reading column, native disclosure triangle |
| `>= 80rem` (wide) | Floats into the inline-start margin gutter (left in LTR, right in RTL) via a Tufte-style negative-margin technique, `clear: inline-start` stacks consecutive notes, border relaxes to decorative `--color-border` (whitespace is now the real separator) | `position: sticky` in the inline-end rail (right in LTR), `.remarque-essay` becomes a 3-column grid (gutter / reading column / rail) |

The rail and margin notes always live OUTSIDE `--content-reading` — that
is the entire point of the module. The center grid track is
`minmax(0, var(--content-reading))`, identical to the plain
`max-width: content-reading; margin-inline: auto` centering used
everywhere else in Remarque; a TOC rail or a floated sidenote can widen
the page shell, never the reading column itself. `.remarque-essay`'s grid
placement rule only ever sets `grid-column` on its children — it never
touches `max-width`/`margin-inline`, so the reading-column assertion
this spec's Enforcement Checklist already covers holds unmodified with
or without this module.

Delete `essay.css`'s single `@media (min-width: 80rem)` block and the
page still renders correctly — that IS the narrow-viewport presentation,
not a degraded one. No JavaScript is required at either width. (The
flagship implementation runs a small script to force `<details>` open on
every breakpoint crossing; this module holds to "no JS required" and
instead specifies `open` by default in the markup — a reader who
manually collapses the TOC below the breakpoint and then widens their
window keeps it collapsed until clicked again, a fully static cost this
module accepts in exchange for not requiring a script tag.)

### Provenance note: the grid-inflation lesson

`.remarque-essay`'s TOC rail spans `grid-row: 1 / span 999`, not
`1 / -1`. With no explicit `grid-template-rows` (as here), `-1` resolves
to "the last explicit row line" — which, with zero explicit rows, is
row 1. The flagship implementation shipped exactly that bug: the rail's
own height inflated row 1, pushing the whole essay down and leaving a
visible gap between the header and the first paragraph on wide
viewports, fixed same-day. This module ships with the fix already
applied so the next consumer doesn't rediscover it.

---

## Patterns

Optional, opt-in composition patterns for specific contexts — unlike the
Essay Module above (one archetype, two related features), a "pattern" in
this section is a small family of primitives meant to be composed
together, shipped as its own subpath rather than aggregated.

### Broadsheet

The editorial Landing/archive pattern: a newspaper-broadsheet voice for
the typography-maximalist end of the system. Own subpath,
`remarque-tokens/broadsheet` (`broadsheet.css`) — not aggregated into
`tokens.css` or `prose.css`.

**Provenance.** Graduated from williamzujkowski.github.io's landing
masthead and archive/tag/post-header implementation, validated in
[PR #213](https://github.com/williamzujkowski/williamzujkowski.github.io/pull/213)
(landing) and [PR #214](https://github.com/williamzujkowski/williamzujkowski.github.io/pull/214)
(archive/tag/post-header) — all Remarque tokens, all audits + axe passing
downstream before upstreaming — ratified in
[issue #36](https://github.com/williamzujkowski/remarque/issues/36) per
the "Graduation" checklist in the package README. No site-specific
literal was copied; every dimension is re-derived from tokens this
package already ships (see `broadsheet.css`'s header comment for the
value-by-value mapping and the fluid-type decision below).

Four primitives, composed independently — a page can use any subset:

1. **Masthead** (`.remarque-masthead`) — centered nameplate: mono
   tracked-capitals kicker, an oversized mixed roman + italic `--font-display`
   title, mono dateline with hairline-rule separators.
2. **Lead article** (`.remarque-lead`) — a featured story: mono kicker
   (`Section · N min read · Date`), a large `--font-display` title with
   underline-grow hover, an italic lede paragraph with an italic drop cap.
3. **Numbered entry list** (`.remarque-entry-list` / `.remarque-entry`) —
   italic oldstyle-figure numerals in the outer margin (via
   `data-entry-number`), a two-column grid (numeral / kicker+title+excerpt),
   a hairline between entries, collapsing to one column in a narrow
   container.
4. **Post-header kicker** (`.remarque-post-kicker`) — the same mono
   `Section · Reading time · Date` line, scaled down to sit above an
   individual post's own title.

### Markup contract

<!-- registry-usage:broadsheet — scripts/build-registry.mjs (issue #100)
     extracts the fenced block immediately below into
     registry/broadsheet.json's usage.html verbatim. -->
```html
<header class="remarque-masthead">
  <p class="remarque-masthead-kicker"><span>Field Notes</span></p>
  <h1 class="remarque-masthead-title">Quiet <em>Signals</em></h1>
  <p class="remarque-masthead-dateline">
    <span class="remarque-rule" aria-hidden="true"></span>
    <span>July 23, 2026</span>
    <span class="remarque-rule" aria-hidden="true"></span>
  </p>
</header>

<article class="remarque-lead">
  <p class="remarque-lead-kicker">
    <span class="remarque-lead-section">Essay</span>
    <span class="remarque-dot" aria-hidden="true">&middot;</span>
    <span>8 min read</span>
    <span class="remarque-dot" aria-hidden="true">&middot;</span>
    <time datetime="2026-04-08">Apr 8, 2026</time>
  </p>
  <h2 class="remarque-lead-title"><a href="/writing/x">Title</a></h2>
  <p class="remarque-lead-lede">Lede paragraph…</p>
</article>

<ul class="remarque-entry-list">
  <li class="remarque-entry">
    <span class="remarque-entry-numeral" data-entry-number="2" aria-hidden="true"></span>
    <div class="remarque-entry-body">
      <p class="remarque-entry-kicker">
        <span class="remarque-entry-section">Essay</span>
        <span class="remarque-dot" aria-hidden="true">&middot;</span>
        <span>6 min read</span>
        <span class="remarque-dot" aria-hidden="true">&middot;</span>
        <time datetime="2026-03-29">Mar 29, 2026</time>
      </p>
      <h3 class="remarque-entry-title"><a href="/writing/y">Title</a></h3>
      <p class="remarque-entry-excerpt">Excerpt…</p>
    </div>
  </li>
</ul>

<header class="remarque-post-header">
  <p class="remarque-post-kicker">
    <span class="remarque-post-kicker-section">Essay</span>
    <span class="remarque-dot" aria-hidden="true">&middot;</span>
    <span>8 min read</span>
    <span class="remarque-dot" aria-hidden="true">&middot;</span>
    <time datetime="2026-04-08">Apr 8, 2026</time>
  </p>
  <h1 class="text-display font-display">Post Title</h1>
</header>
```

Requirements the CSS depends on:

- `.remarque-entry-list` uses `<ul>`, not `<ol>` — the visual numeral is
  decorative (`aria-hidden`) and generated from `data-entry-number`; an
  `<ol>` would have a screen reader announce "1 of 2" alongside it, a
  second voice for the same information.
- Entry numerals are generated via `content: attr(data-entry-number)` on
  `.remarque-entry-numeral::before`, NOT CSS `counter()`. `attr()` reads
  the attribute of the element the pseudo-content is generated on, so
  `data-entry-number` goes on `.remarque-entry-numeral` itself, not the
  parent `<li>`.
- Every kicker/dateline row (`.remarque-masthead-kicker`,
  `.remarque-masthead-dateline`, `.remarque-lead-kicker`,
  `.remarque-entry-kicker`, `.remarque-post-kicker`) uses
  the label voice: tracked capitals (`text-transform: uppercase` +
  `--tracking-caps`), because the default mono face has no small caps
  (see "Small Caps"; #124). Until 0.28 these were synthesized
  `all-small-caps`.

### Fluid-type decision: the masthead title

The flagship's masthead title is `clamp(3.5rem, 9vw, 7.5rem)` — bigger
than `--text-display` (tokens-core.css's largest type-scale rung,
`clamp(2.75rem, 5.5vw, 5rem)`) ever reaches. Per issue #36's required
call: express via an existing type token if the scale reaches that size,
else a documented fluid exception using core tokens as bounds — never a
new core token.

The scale does not reach it, so `.remarque-masthead` declares a
file-scoped custom property whose min/max bounds are arithmetic on
tokens already in `tokens-core.css`, not new literals:

```css
--remarque-masthead-size: clamp(
  calc(var(--space-7) + var(--space-2)),   /* 3rem + 0.5rem = 3.5rem */
  9vw,
  calc(var(--space-10) - var(--space-2))   /* 8rem - 0.5rem = 7.5rem */
);
```

Both bounds resolve to the exact flagship values already validated
downstream (contrast/gamut/font-floor audits + axe). The rate 9 continues
the same escalating per-tier progression `tokens-core.css`'s own scale
already uses (2.25vw section → 3.5vw title → 5.5vw display), one step
further for a register one step past display. This property is declared
inside `broadsheet.css` only, never added to `tokens-core.css` — it is
local arithmetic on existing core tokens, not a new one.

**Sized from the nameplate, not the viewport (0.28, #121; ratified 7–0,
`vote-1792889632787-bm0nogp`).** Type should be sized from the measure it
sits in (Tim Brown, *Flexible Typography*), so the rate is `9cqi` of the
nameplate's own box. `.remarque-masthead` is an inline-size container
whose box is `--content-standard` (72rem), the page-width register a
newspaper nameplate spans; the lead article and entry list below it stay
at `--content-reading`. Inside `@supports (width: 1cqi)` the property is
redeclared with `9cqi`; the `9vw` declaration above stays as the
fallback. Because the property is unregistered, `cqi` resolves where the
title uses it, against the nameplate box.

Why not keep the reading-measure box: until 0.28 the title grew at `9vw`
inside a box capped at `--content-reading`. When that token went to 38rem
in 0.27 the box stopped at about 640px of viewport while the title kept
growing to 7.5rem, so "Notes Toward a Quieter Typography" wrapped to four
lines at 1280px. Sizing from a 38rem box instead tops out near 67px,
*below* the `--text-display` lead title beneath it (70–80px), which
inverts the hierarchy this pattern exists for. Measured at 1280px and
up, the 72rem nameplate sets the title at about 98px, holds four- to
seven-word titles to two lines, and keeps it above the lead.
`site/tests/page-axis.spec.ts` gates both (at most 2 lines for a
four-word title at 768, 1280 and 1920px; masthead larger than lead).

Everywhere else in the pattern, an existing token already covers the
register: `.remarque-lead-title` uses `--text-display` as-is (its
2.75–5rem range covers the flagship's 2.25–3.75rem closely enough that
no exception is warranted), and `.remarque-entry-title` uses
`--text-section` as-is (1.375–2rem vs. the flagship's 1.5–1.875rem).

### When to use

Landing/archive contexts only — a Landing page's masthead, or an
archive/tag-listing page's lead-plus-entry-list. Typography-maximalist:
this is the one pattern in Remarque where a title is allowed to outgrow
`--text-display`, and it is deliberately reserved for exactly one
register, not a general-purpose "big heading" utility. The post-header
kicker is the one primitive meant for individual post pages rather than
the archive itself.

---

## Forms

Native form-control primitives — field wrapper, text input, checkbox,
radio, button — shipped as their own subpath, `remarque-tokens/forms`
(issue #27). Unlike the Essay Module and the Broadsheet pattern, this
module was not graduated from a downstream site implementation; it is
spec-native, built directly from the issue rather than re-expressing an
existing literal.

### Markup contract

<!-- registry-usage:forms — scripts/build-registry.mjs (issue #100) extracts
     the fenced block immediately below into registry/forms.json's
     usage.html verbatim. -->
```html
<div class="remarque-field">
  <label class="remarque-field-label" for="email">Email</label>
  <input class="remarque-input" type="email" id="email" name="email"
    autocomplete="email" aria-describedby="email-help" />
  <p class="remarque-field-message" id="email-help">
    We'll never share your email.
  </p>
</div>

<div class="remarque-field" data-state="error">
  <label class="remarque-field-label" for="email2">Email</label>
  <input class="remarque-input" type="email" id="email2" name="email2"
    autocomplete="email" aria-invalid="true" aria-describedby="email2-message" required />
  <p class="remarque-field-message" id="email2-message" role="alert">
    Enter a valid email address.
  </p>
</div>

<label class="remarque-checkbox">
  <input type="checkbox" name="subscribe" />
  <span>Subscribe to updates</span>
</label>

<label class="remarque-radio">
  <input type="radio" name="plan" value="a" />
  <span>Plan A</span>
</label>

<button class="remarque-button" type="button">Cancel</button>
<button class="remarque-button remarque-button--primary" type="submit">Submit</button>
```

| Class | Applies to | Notes |
|---|---|---|
| `.remarque-field` | wrapping `<div>` | Label + control + message vertical stack. Layout only — no border/background of its own. |
| `.remarque-field-label` | `<label>` | Meta voice (mono, tracked capitals, `--color-muted`) — same declarations as `.text-label`, repeated per the non-mixin precedent essay.css/broadsheet.css already set. |
| `.remarque-field-required` | `<span aria-hidden="true">` inside the label | Accent-colored asterisk. `aria-hidden` — the input's own `required` attribute is the real signal a screen reader announces. |
| `.remarque-field-message` | `<p>` after the control | Help text by default; recolored by the parent's `data-state`. Wire `aria-describedby` on the input to this element's `id` in every case, valid or not. |
| `autocomplete` (attribute) | `.remarque-input` collecting known personal data | WCAG 3.3.7 / 3.3.8: inputs that collect known personal data (name, email, tel, address, `current-password`, `one-time-code`, ...) carry a valid [`autocomplete` token](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill), and never block paste (no `onpaste` handlers that cancel it). |
| `.remarque-input` | `<input>` / `<textarea>` / `<select>` | Body-voice text, `--color-border-bold` boundary, `--radius-sm`, ≥44px tall. |
| `.remarque-checkbox` / `.remarque-radio` | wrapping `<label>` | `accent-color` on the native control — no `appearance: none`, no hand-drawn replacement. The wrapping label carries the 44px touch target; the control itself stays at its natural (enlarged) size. |
| `.remarque-button` | `<button>` | Quiet default: bordered, transparent, body-voice text. |
| `.remarque-button--primary` | `<button>` | The one sanctioned accent placement per viewport (Visual Rules) — accent text + accent border, never a solid accent fill. Hover washes in `--color-accent-subtle`, it does not darken to a filled block. |

### State wiring

`data-state="error"` / `"success"` / `"warning"` on `.remarque-field`
recolors both the input's border and the message text from the 0.17.0
state-color tokens (`--color-error`/`--color-success`/`--color-warning`).
`data-state` is the PAINT layer only — always pair it with the real
accessibility signal on the input itself: `aria-invalid="true"` (screen
readers announce this; `data-state` alone is invisible to them) and
`aria-describedby` pointing at the `.remarque-field-message` id. A
disabled control never gets a `data-state` — it uses the native
`:disabled`/`disabled` state and `--color-disabled`, which is a muted
register, not one of the three feedback hues (REMARQUE.md "State Colors":
disabled is deliberately not ANSI-derived).

**State is never color alone (0.30, #128; WCAG 1.4.1).** Each state message carries a glyph in every mode: ✕ error, ⚠ warning, ✓ success. Under simulated deuteranopia the default error and success colors are only ΔE2000 2.7 (light) and 1.7 (dark) apart, so the glyph is what tells them apart. It has empty alt text, so the message has to say what's wrong in words ("Enter an email address", not "Invalid"), and `aria-invalid` still carries the state for screen readers. Before 0.30 the glyphs appeared only under forced colors.

**Read-only, pending and auto-growing fields (0.30, #129).**
- `readonly` inputs get a quiet `--color-bg-subtle` fill: visibly not editable, still legible, focusable and copyable. The selector is `[readonly]`, not `:read-only`, which also matches checkboxes, selects and buttons.
- **Pending submit is text, not a spinner.** Disable the button, change its label ("Send" → "Sending…"), and announce completion or failure through a polite live region (`<p role="status">`). Don't put `aria-busy` on the button (it's for regions being updated, and AT support on controls is poor), and never add a spinner (AGENT_RULES bans decorative motion).
- `.remarque-input--autosize` on a `<textarea>` grows with its content (`field-sizing: content`, Baseline 2026-06), from the 6rem minimum up to a 24rem cap. Older engines keep the fixed, scrollable textarea.
- **Hover only where hover exists.** Button and input hover washes sit inside `@media (hover: hover)`, so a tap doesn't leave a control looking hovered. `:active` gives buttons a pressed state (border to `--color-fg`) on every input type.

As a zero-JS bonus layer, `.remarque-input:user-invalid` (guarded with
`@supports selector(:user-invalid)`) picks up the same error border once
a browser supports the pseudo-class and the user has actually interacted
with an invalid field — it never replaces authoring `data-state="error"`
explicitly, since `:user-invalid` alone has no matching text-message
recolor and no `aria-invalid` wiring of its own.

A second `:has()`-powered bonus layer (issue #97) goes one step further:
`:user-invalid` alone can only style the input it matches — CSS has no
"parent selector" without `:has()`, so it cannot reach the field's label.
`.remarque-field:has(.remarque-input:user-invalid) .remarque-field-label`
recolors the label to `--color-error` too, and
`.remarque-field:has(.remarque-input:focus-visible) .remarque-field-label`
brightens the label to `--color-fg` while any control in the field has
keyboard focus — a quiet secondary cue, not a replacement for the
control's own native `:focus-visible` outline. Both are guarded with
`@supports selector(:has(...))` (the same "the browser lacking this
falls back to `data-state`/`aria-invalid`" shape as `:user-invalid`
itself) and, like that layer, are bonus visual cues rather than one of
the canonical `data-state` states — `data-state` stays the one
contract every consumer must author explicitly; `:has()` never replaces
it, only adds a zero-JS enhancement on top for browsers that support it.

### Restraint rules restated

- **Border radius**: form controls cap at `--radius-sm` (4px) — a
  tighter ceiling than AGENT_RULES.md's general `--radius-md` (8px)
  maximum for other chrome. A smaller, more precise-reading radius suits
  a control the user directly manipulates.
- **Touch targets**: every interactive control — input, textarea,
  select, button, and the `<label>` wrapping a checkbox/radio — is
  ≥44×44px (exceeds WCAG 2.5.8 AA's 24px minimum and meets 2.5.5 AAA, USWDS floor; see "Touch Targets" above and
  `.nav-link`'s identical convention in the demo site's `globals.css`).
- **No fake replacements**: checkboxes and radios stay native elements
  recolored with `accent-color` only. No `appearance: none` plus a
  hand-drawn box/dot — that would trade away native keyboard behavior,
  forced-colors-mode support, and screen-reader state announcements for
  a purely cosmetic win this system doesn't need.
- **Buttons stay quiet**: text-only or bordered, never filled/solid by
  default — the primary variant included. Accent appears as text/border
  color, never as a background fill (Visual Rules' one-accent rule and
  Components' "never filled/solid as default" both still govern the
  emphasized variant).
- **Placeholder contrast**: `--color-muted` (4.5:1 on `--color-bg`/
  `--color-surface`), a conscious choice — placeholder text is
  supplementary hint copy, never the field's only label, so AA is the
  correct tier rather than `--color-fg-muted`'s AAA.

### Standalone tables

`forms.css` also ships `.remarque-table` / `.remarque-table-wrap`
(issue #30) — the same visual language as `.remarque-prose table`
(mono `th` voice, 2px header rule, 1px row rules, `.num` for tabular-
lining right-aligned numeric columns), re-scoped under a top-level
class so a standalone data grid doesn't have to wrap itself in the full
`.remarque-prose` container (which also applies oldstyle proportional
numerals and prose spacing rhythm a data table doesn't want):

```html
<div class="remarque-table-wrap">
  <table class="remarque-table">
    <caption>Example</caption>
    <thead>
      <tr><th>Name</th><th class="num">Count</th></tr>
    </thead>
    <tbody>
      <tr><td>Rows</td><td class="num">42</td></tr>
    </tbody>
  </table>
</div>
```

Lives in `forms.css` rather than its own subpath — AGENT_RULES.md's
build order already groups tables with buttons/cards/code blocks as one
"supplementary UI" step, and this table variant is a small re-scoping,
not enough surface area to justify a fourth optional module.

### When NOT to use

Remarque is editorial-first. This module exists for the handful of
form moments a written-word site actually needs — a contact form, a
site search box, a newsletter signup — not for building application
UIs. If a page needs more than a few fields, conditional multi-step
logic, inline data tables of editable rows, or anything that starts to
resemble a settings/dashboard screen, that is out of scope for
Remarque's forms primitives; reach for a dedicated UI/form library
instead and keep Remarque to the page's editorial chrome around it.

---

## Chrome Module

`remarque-tokens/chrome` (`chrome.css`, 0.29, #127): the site-chrome and wayfinding pieces this spec requires and never shipped CSS for, so every consumer hand-rolled its own. The skip link alone had four implementations across the flagship, tsundoku, the starter and this demo. One `left: -9999px` broke under RTL, and a tsundoku pagination kept its "disabled" endpoints as focusable links with `pointer-events: none`. The module isn't aggregated into `tokens.css`; import it after the tokens. Everything in it speaks in the mono meta register, and every link meets the 44px floor on coarse pointers. Each piece is a registry item whose markup contract `scripts/test-registry.mjs` asserts.

### Skip link

The first focusable element in `<body>`, targeting `<main id="main-content" tabindex="-1">`. It's visually hidden (clip-path, never an off-screen offset) until focused, then shows as a filled `--color-fg` block at the top inline-start corner on `--z-skip-link`. The `tabindex="-1"` lets focus land on `<main>`; `chrome.css` drops the outline for that programmatic focus. `.remarque-sr-only` is the same visually-hidden pattern for any text that's for screen readers only. `print.css` hides the skip link.

<!-- registry-usage:skip-link — scripts/build-registry.mjs (issue #127)
     extracts the fenced block immediately below into
     registry/skip-link.json's usage.html verbatim. -->
```html
<body>
  <a class="remarque-skip-link" href="#main-content">Skip to content</a>
  <header>…site navigation…</header>
  <main id="main-content" tabindex="-1">…</main>
</body>
```

### Breadcrumb

The Reference/Docs "breadcrumb kicker": `nav[aria-label="Breadcrumb"] > ol`. The last item is the current page: `aria-current="page"` on a `<span>`, **not a link**. The separator is generated by CSS with empty alt text, so screen readers don't read "slash", and is never typed into the DOM.

<!-- registry-usage:breadcrumb — scripts/build-registry.mjs (issue #127)
     extracts the fenced block immediately below into
     registry/breadcrumb.json's usage.html verbatim. -->
```html
<nav class="remarque-breadcrumb" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/reference/">Reference</a></li>
    <li><span aria-current="page">Configuration</span></li>
  </ol>
</nav>
```

### Pager

Prev/next between adjacent pages: the Essay and Reference/Docs footers, and Plate figure navigation. Links carry `rel="prev"` and `rel="next"`; a label line ("Previous", "Next", in the label voice) sits over the target's title. **An endpoint with nothing beyond it is omitted, never rendered as a disabled-looking link.** `.remarque-pager-next` stays on the inline-end side even when it's alone. An optional `.remarque-pager-series` row gives "Part N of M" and a `<details>` list of every part, with the current one `aria-current="page"` and not a link. There's no progress bar; the text carries it. Archives use `.remarque-pagination`: numbered pages in `nav[aria-label="Pagination"] > ol`, where the current page is `aria-current="page"` text, and prev/next at the ends are links when there's somewhere to go and plain text when there isn't.

<!-- registry-usage:pager — scripts/build-registry.mjs (issue #127)
     extracts the fenced block immediately below into
     registry/pager.json's usage.html verbatim. -->
```html
<nav class="remarque-pager" aria-label="More writing">
  <div class="remarque-pager-series">
    <details>
      <summary>Part 2 of 3 · Quiet Interfaces</summary>
      <ol>
        <li><a href="/writing/quiet-1/">Against Decoration</a></li>
        <li><span aria-current="page">Typography as Interface</span></li>
        <li><a href="/writing/quiet-3/">The Reading Column</a></li>
      </ol>
    </details>
  </div>
  <a class="remarque-pager-prev" href="/writing/quiet-1/" rel="prev">
    <span class="remarque-pager-label">Previous</span>
    <span class="remarque-pager-title">Against Decoration</span>
  </a>
  <a class="remarque-pager-next" href="/writing/quiet-3/" rel="next">
    <span class="remarque-pager-label">Next</span>
    <span class="remarque-pager-title">The Reading Column</span>
  </a>
</nav>

<nav class="remarque-pagination" aria-label="Pagination">
  <ol>
    <li><span>Previous</span></li>
    <li><span aria-current="page">1</span></li>
    <li><a href="/writing/page/2/">2</a></li>
    <li><a href="/writing/page/3/">3</a></li>
    <li><a href="/writing/page/2/" rel="next">Next</a></li>
  </ol>
</nav>
```

### Tags

"Tags or categories (mono text, not pill badges)": a wrapping row of plain mono links in a `<ul>` with an accessible name, each with `rel="tag"`. **No border, fill or radius.** An outlined or filled chip is a documented deviation (`DESIGN-DEVIATIONS.md`), not personalization, the same rule as semver pills in the Changelog archetype.

<!-- registry-usage:tags — scripts/build-registry.mjs (issue #127)
     extracts the fenced block immediately below into
     registry/tags.json's usage.html verbatim. -->
```html
<ul class="remarque-tags" aria-label="Tags">
  <li><a href="/tags/typography/" rel="tag">typography</a></li>
  <li><a href="/tags/design-systems/" rel="tag">design-systems</a></li>
</ul>
```

---

## Palette Deck

A tiny runtime (`remarque-tokens/deck`, `deck.js`) for switching between
several `remarque-theme`-generated palettes on one site — register a set
of palette names, switch the active one, persist the choice, restore it
before first paint. Issue #56.

**What this module deliberately does NOT do.** The flagship site's
`theme-deck.css` (12 terminal palettes as `:root[data-theme-deck=…]`
overrides) was originally proposed for upstreaming as-is. A 2026-07-23
consensus panel (3-0) re-scoped it: generation, contrast solving, and
hue/pairing all now come from `remarque-theme` (`scripts/theme.mjs`,
"Color Providers" above) — that pipeline makes deriving a new palette
nearly free, so graduating a second, parallel generator would just
duplicate it. What's left — and what this module is *only* — is the part
`remarque-theme` doesn't provide: switching between already-generated
palettes at runtime. No color math, no contrast solving, no palette
authoring lives in `deck.js`; it is a dependency-free ~60-line ESM file
that sets an attribute, reads/writes `localStorage`, and hands back
enough to build a FOUC-safe restore. If you need to *generate* a palette,
see "Color Providers"; this section is exclusively about *switching*
between ones you already have.

### The mechanism: `--scope`

`remarque-theme` gained a `--scope <name>` flag for this module. Without
it, output owns `:root` / `[data-theme="dark"]` outright — the normal,
single-palette case. With `--scope <name>`, the same derivation emits
under `[data-palette="<name>"]` / `[data-palette="<name>"][data-theme="dark"]`
instead, so several generated palettes can coexist in one stylesheet
(or several stylesheets) without fighting over `:root`:

```
npx remarque-theme gruvbox-light --dark gruvbox-dark --scope gruvbox -o palettes/gruvbox.css
npx remarque-theme rose-pine-dawn --dark rose-pine --scope rose-pine -o palettes/rose-pine.css
```

`--scope`'s value is interpolated into a CSS attribute selector, so it is
validated with the exact same slug grammar as `<light-slug>`/`--dark`
(lowercase alphanumeric segments joined by single hyphens) before it
touches any output — a scope name is a caller-supplied label with no
upstream index to check it against, which is exactly why the regex
carries the full weight here rather than acting as defense-in-depth for
a separate lookup. Derivation, self-verification, and every contrast/
gamut guarantee in "Color Providers" are **completely unaffected by
scoping** — `theme.mjs` self-verifies the derived `[L, C, H]` values
before it ever chooses a selector to emit them under, so a scoped and
unscoped run of the same light/dark pair produce byte-identical
declarations, differing only in which selector wraps them (fixture-
tested in `scripts/test-theme.mjs`).

### The audit story for scoped palettes

`remarque-audit`'s selector classification (`scripts/lib/css-tokens.mjs`,
`isLightRoot`/`isDarkBlock`) recognizes `[data-palette="name"]` directly:
a bare `[data-palette="name"]` block counts as that scope's light root
(the same kind of exact-match special case the file already carries for
`[data-theme="light"]`), and `[data-palette="name"][data-theme="dark"]`
was already recognized as dark by the existing rule (it contains the
`[data-theme="dark"]` substring and starts with `[`) — no change needed
there. This was the smaller correct fix, not a bespoke new
attribute-selector grammar: one exact-match regex, symmetric with a
pattern the file already used, rather than teaching the parser to
understand arbitrary compound attribute selectors. The result: a
`--scope`'d file is auditable exactly like any other palette file —
`npx remarque-audit --palette palettes/gruvbox.css --src <dir>` — no
"generate the unscoped version first" workaround required.

### Markup/wiring contract

Set (or clear) `data-palette` on `<html>`, alongside the existing
`data-theme` attribute — the two compose independently. A deck palette
carries *both* light and dark halves, so the light/dark toggle keeps
working no matter which palette (or none) is active:

<!-- registry-usage:palette-deck — scripts/build-registry.mjs (issue #100)
     extracts the fenced block immediately below into
     registry/palette-deck.json's usage.html verbatim. The FOUC-safe
     `<script>` snippet a few lines down is deliberately NOT marked for
     extraction — see REMARQUE.md "The Registry" and the PR description
     for why (the registry's blocking no-executable-content condition is
     held to an unambiguous zero-`<script>`-tag bar across every item;
     that snippet's full text still lives here, one section up, and is
     linked from the registry item's `docs` URL). -->
```html
<html data-theme="dark" data-palette="gruvbox">
```

```js
import { createDeck } from 'remarque-tokens/deck';

const deck = createDeck(['gruvbox', 'rose-pine']); // registered names
deck.restore();                 // re-apply a persisted choice, if any
deck.apply('rose-pine');        // switch + persist
deck.apply(null);                // back to the unscoped default palette
deck.current();                  // 'rose-pine' | null
```

`createDeck` validates every `apply()` call against the registered name
list and throws on an unknown one — the deck never sets an attribute
value it wasn't told about. Persistence (`localStorage`, default key
`remarque-palette`) degrades to in-memory-only if storage is unavailable
(private browsing, SSR) rather than throwing.

**FOUC-safe restore.** Exactly like the light/dark theme toggle's own
`<head>` script (see the demo's `BaseLayout.astro`), the deck's restore
must run as a synchronous, render-blocking **classic** inline script
physically in `<head>` — an ESM `<script type="module">` is deferred by
the HTML spec and would let the default palette flash before the stored
one applies. So the head snippet duplicates the ~3-line read-and-apply
logic directly rather than importing `deck.js` (the same reason the
theme toggle's head script doesn't import anything either):

```html
<script is:inline>
  (function() {
    var p = localStorage.getItem('remarque-palette');
    if (p) document.documentElement.setAttribute('data-palette', p);
  })();
</script>
```

`deck.js` itself is loaded later (deferred/module, after first paint) to
wire the switcher UI's change handler and to keep `restore()` available
for pages that need to re-derive `current()` after the fact.

### Building a deck: `remarque-deck` and the curated set (0.31)

The terminal themes in [`@williamzujkowski/oklch-terminal-themes`](https://www.npmjs.com/package/@williamzujkowski/oklch-terminal-themes) are the deck's source. Ratified 6–1 in `vote-1792898589702-ofkch6y`: each site keeps **its own palette as the default**, and the deck is a reader's preference on top of it.

- **The curated deck ships prebuilt.** `remarque-tokens/deck.css` holds 15 reviewed light/dark pairs: the dataset's `popular` pairs, minus near-duplicates. They are Atom One, Ayu, Catppuccin, GitHub, Gruvbox, Gruvbox Material, Iceberg, Material, Monokai Pro, Nord, One Half, Rosé Pine, Solarized, Tokyo Night and Tomorrow. `remarque-tokens/deck.json` is the matching manifest of names, labels, source slugs and swatches. They are built in this repo from the pinned dataset and freshness-gated in CI (`remarque-deck --curated --check`). The list pins slugs, and shipping the built files pins the colors too: a dataset release never changes a site's deck, and changes to the curated set ship as remarque minors. A site needs no dataset install to use it. The whole file is about 8 KB gzipped (budgeted in `budgets.json`), so one cached stylesheet is the default.
- **Every palette is paired and follows the page's mode.** Each one is emitted with `remarque-theme --format light-dark` as a single `light-dark()` block. It renders light or dark from whatever `color-scheme` the page sets (`[data-theme]`, a `.dark` class, or `prefers-color-scheme` alone), so choosing a palette never forces a mode. The flagship's earlier single-mode deck did force one.
- **Scoped selectors outrank the site palette.** Blocks are `:root:root[data-palette="<name>"]`, specificity (0,3,0). That beats `:root` and `[data-theme]` (0,1,0) and the class conventions sites use for their own palette, `:root.dark` and `:root:not(.light)` (0,2,0), whatever order the stylesheets load in. Until 0.31 a scoped light block was (0,1,0) and lost to any `:root` palette loaded after it.
- **Every palette is audited.** `remarque-deck` runs `remarque-audit` on each palette and fails the whole build on any failure. All 73 light/dark pairs in the dataset derive and pass.
- **Custom decks:** `npx remarque-deck <light>[:<dark>][=<name>] … --out-dir <dir>` builds your own list (add `--curated` to start from the reviewed set). `--default <your-palette.css>` emits the picker swatches for your own palette. Without it, the default swatches are the package's default palette, so a site with its own palette should declare `[data-palette-swatch="default"] { --swatch-bg; --swatch-fg; --swatch-accent }` in its palette file, or build with `--default`.

**Integration gotchas** (each found while adopting the deck on a real site): code that reads a color token as *text*, such as a `theme-color` meta sync, gets an unresolved `light-dark(…)` and must resolve it through a probe element instead. Inline critical CSS with literal colors outranks the deck unless it's scoped `:not([data-palette])`. Client-side navigation (view transitions) must carry `data-palette` across page swaps.

### Picker markup contract

A `<details>` disclosure holding a `<fieldset>` of **native radio inputs**: one per palette, plus `value=""` for the site's own. Native radios are keyboard-operable with no ARIA-radio script. `deck.js`'s `bindPicker(deck, container, { onChange })` applies the choice and checks the radio for the active palette on load. Swatches are `aria-hidden` decoration whose colors come from `deck.css` (`[data-palette-swatch="<name>"]`, as `light-dark()`), so they show each palette's own colors in the current mode and don't repaint when another palette is active. The picker styles live in `remarque-tokens/chrome`.

<!-- registry-usage:deck-picker — scripts/build-registry.mjs (0.31)
     extracts the fenced block immediately below into
     registry/deck-picker.json's usage.html verbatim. -->
```html
<details class="remarque-deck-picker" id="palette-picker">
  <summary>Theme: <span data-deck-current>Site default</span></summary>
  <fieldset>
    <legend class="remarque-sr-only">Color theme</legend>
    <label class="remarque-deck-option">
      <input type="radio" name="remarque-palette" value="" checked />
      <span class="remarque-deck-swatches" data-palette-swatch="default" aria-hidden="true"><span></span><span></span><span></span></span>
      Site default
    </label>
    <label class="remarque-deck-option">
      <input type="radio" name="remarque-palette" value="nord" />
      <span class="remarque-deck-swatches" data-palette-swatch="nord" aria-hidden="true"><span></span><span></span><span></span></span>
      Nord
    </label>
  </fieldset>
</details>
```

**Put it where readers look for it (0.32).** The default is the **popover variant**, `remarque-deck-picker--popover`: a 44px icon button (give the `<summary>` an `aria-label`) beside the light/dark toggle in the header. Its panel drops down from the inline-end edge and becomes a bottom sheet under 40rem. Wire it with `bindPicker(deck, picker, { dismissible: true })` so Escape and an outside click close it. A footer-only picker, which is how the first adopters placed it, was missed on long pages. The plain variant, a disclosure row with a ▸ marker, suits short pages or a settings page.

Render one `<label>` per entry in `deck.json`'s `palettes`. Wire it with an ES module, outside the registry's zero-script bar:

```js
import { createDeck, bindPicker } from 'remarque-tokens/deck';
import manifest from 'remarque-tokens/deck.json' with { type: 'json' };
const deck = createDeck(manifest.palettes);
bindPicker(deck, document.getElementById('palette-picker'));
```

### Provenance

Re-scoped from the flagship site's theme-deck on the way up (issue #56,
consensus panel, 2026-07-23) — see the root README's "Graduation"
section. The original proposal predated `remarque-theme`; once that
pipeline existed, generating N palettes stopped being the hard part and
switching between them became the only piece worth a shared module.

---

## The Registry

A machine-readable markup-contract registry — `registry.json` (index) +
`registry/<name>.json` (four full items: `essay`, `broadsheet`, `forms`,
`palette-deck`) — shipped for the ratified program's flagship item
(issue #100). The funding rationale is narrow and mechanical, not
"category-defining": it exists to prevent the exact bug class found in
the flagship migration's sidenote implementation (#89,
williamzujkowski.github.io#380) — an aria-label that drifted out of DOM
order because the markup contract lived only as ~80 lines of spec prose
an agent had to transcribe by hand. A registry item is that same known-
good markup as versioned, hash-pinned DATA an agent fetches and applies
instead.

**Shape.** Adopted from shadcn/ui's `registry-item.json`/`registry.json`
(`https://ui.shadcn.com/schema/registry-item.json`,
`https://ui.shadcn.com/schema/registry.json`) — field NAMES that fit a
CSS+HTML contract are kept as-is (`name`, `title`, `description`,
`dependencies`, `registryDependencies`, `files[].path`/`content`/`type`,
`cssVars`, `docs`); this is deliberately **not** a parallel invented
schema. The two vendored, hand-authored schemas
(`registry-item.schema.json`, `registry.schema.json` at the package
root) document every adaptation and omission inline, in the property
descriptions themselves — the summary:

- **`type` is `"remarque:contract"`**, not one of shadcn's `registry:*`
  values (`registry:lib`/`component`/`ui`/`hook`/`page`/...). None of
  those describe a dependency-free CSS module plus its markup sample —
  every shadcn value assumes an installable React-ecosystem artifact.
  One honest value covers all four items today, since they're all the
  same KIND of thing; a second value would only be minted for a future
  item that is a genuinely different kind of contract.
- **`cssVars` is repurposed**: shadcn's `cssVars` holds theme
  {`theme`/`light`/`dark`} VALUES to merge into a consumer's stylesheet.
  This registry ships whole CSS files verbatim instead (single-sourced
  from the real `.css` at build time — see "Single-sourcing" below), so
  there's nothing to merge; `cssVars` here is the flat, deduped list of
  `--custom-property` NAMES the item's CSS actually reads via `var(...)`
  — the palette-tier tokens it consumes, mechanically grepped, never
  hand-maintained.
- **`docs` is a URL, not markdown.** shadcn's `docs` is a documentation
  blob; this registry's `docs` is a single HTTPS link into this file's
  relevant section. The registry doesn't duplicate spec prose — it
  points back at the one place that prose lives.
- **Omitted fields** (documented once here, not repeated per-field):
  `tailwind`/`css`/`envVars` (no Tailwind config, direct CSS injection,
  or env vars — these items ship whole files, not fragments to splice
  in), `font`/`extends`/`style`/`iconLibrary`/`baseColor`/`theme` (all
  `registry:font`/`registry:base`-specific — not applicable to any item
  here), `files[].target` (no CLI installer — see "What this deliberately
  is NOT"), `meta` (no per-item metadata that doesn't already have a
  named field).
- **`registry.json` is a lightweight index**, not shadcn's full-item
  embedding. shadcn's `items` array holds complete registry-item objects
  inline; this index instead lists one pointer per item (`name`, `type`,
  `title`, `description`, `version`, `integrity`, `file`) and leaves the
  full payload — all file content — in `registry/<name>.json` only, so a
  consumer can discover what exists and check its pinned hash before
  deciding whether to fetch the full item.

**Security (panel-mandated, blocking).** Every item carries a `version`
(the exact `remarque-tokens` release it was generated from) and an
`integrity` hash (`sha256-<base64>`, the same shape as W3C Subresource
Integrity — computed over the item's `files` at build time by
`scripts/lib/registry-extract.mjs`'s `sha256OfFiles`); `registry.json`'s
index mirrors both per item, so a consumer can check the pin before
fetching the full payload and must recheck it against what it actually
receives. Every `docs`/`homepage` URL is `https://`. No item contains
executable content — `scripts/test-registry.mjs` asserts no file's
`content`, across every item without exception, contains the substring
`<script`.

That last rule is why `deck.js` — the Palette Deck's runtime module, a
dependency-free ~60-line ESM file, and the one JS asset this package
ships — is **not embedded in the registry at all**, even hashed and
labeled. The panel's condition reads as an absolute ("no executable
content in registry items ... files are HTML/CSS data"), and the honest
call under a *blocking* security condition is to hold that line without
exception rather than carve out a documented-but-included special case.
Concretely: `registry/palette-deck.json` ships **only** the
`data-theme`/`data-palette` HTML fragment from this file's "Markup/wiring
contract" section — it does *not* include the FOUC-safe restore
`<script>` sample documented a few lines below that fragment, even
though that snippet is (arguably) still "just an HTML example." Holding
every item to a zero-`<script>`-tag bar, with no case-by-case judgment
call about which scripts "count," is a simpler rule to mechanically
enforce forever than "no script tags, except this one, which is fine
because—". Consumers keep getting `deck.js` the normal way — the
`remarque-tokens/deck` package import, listed as an ordinary
`dependencies` entry on every item — and the FOUC snippet's full text
from this section, linked via the item's `docs` URL.

**Modeling the tokens dependency.** essay/broadsheet/forms all consume
palette-tier tokens, and the issue asked whether `tokens` should be a
fifth registry item or a documented external dependency. It's the
latter: every item's `dependencies` array lists `"remarque-tokens"` — an
ordinary npm dependency, the same field shadcn uses for npm packages a
component needs. Modeling tokens as a *registry item* would mean
re-embedding (a subset of, or all of) `tokens.json`'s content a second
time in a differently-shaped artifact; `tokens.json`/`tokens.schema.json`
already exist as the purpose-built machine-readable form of the tokens
(issue #99), served at the same site alongside this registry. Depending
on the package that ships them is the smaller, honest mechanism.

**Single-sourcing.** Every item's CSS `content` is read verbatim from the
real `.css` file at build time (`essay.css`, `broadsheet.css`,
`forms.css`) — never a second hand-copied literal. Every item's
`usage.html` is extracted from THIS file's own "Markup contract" fenced
```html blocks via an HTML-comment marker
(`<!-- registry-usage:<name> -->`) placed immediately before the fence —
`scripts/lib/registry-extract.mjs`'s `extractUsageHtml` finds the marker,
then the next fenced block, and lifts its content verbatim. This spec's
prose stays the ONE hand-authored copy of each known-good sample; the
registry is a build artifact derived from it, exactly like `tokens.json`
is derived from the CSS. `scripts/build-registry.mjs --check` gates
freshness in CI the same way `scripts/tokens-json.mjs --check` already
does for tokens.

**Validation (the enforce-don't-instruct house pattern).**
`scripts/test-registry.mjs` is the CI gate, wired alongside the other
freshness/fixture checks in `ci.yml`. It re-derives, mechanically,
the exact contract lines this issue is funded on — not by trusting the
prose, by parsing the generated `usage.html` itself:

- Every essay `.remarque-sidenote-ref` carries `aria-label="Note N"`, and
  refs/notes strictly alternate in DOM order — the precise shape of the
  #89 bug.
- The essay TOC rail (`.remarque-toc-rail`) carries `aria-label`.
- Every broadsheet `.remarque-entry-numeral` carries `data-entry-number`.
- Every forms `<input id="...">` has a matching `<label for="...">`, and
  every `aria-describedby` target id exists in the sample.
- No file, in any item, contains `<script` (the no-executable-content
  rule above).

Plus the structural gates any generated artifact needs: schema
validation (via `ajv`, the same devDependency `tokens.schema.json`
already uses) with negative fixtures proving the schemas actually reject
malformed input, and an independent recomputation of every `integrity`
hash proving it wasn't just carried over from a stale build.

**Installing with the shadcn CLI (#130).** The `remarque:contract` items
above fail shadcn's `type` enum, so a parallel, schema-valid copy is
generated from the same definitions into `registry/shadcn/` (an index
`registry.json` plus one `<name>.json` per item, freshness-checked by
`build-registry.mjs --check`). Each is `type: "registry:item"` (the
schema's catch-all for a bundle that is neither a component nor a theme),
with `files[]` entries of `type: "registry:file"` and a `target`
(`src/styles/remarque/<name>.css`, `src/components/remarque/<name>.usage.html`;
the palette-deck item is markup-only). `remarque-tokens` is listed under
`dependencies` (npm packages, which the CLI installs), and Remarque-only
fields (`version`, `integrity`, `docs` URL, `cssVars` names) sit under
`meta`. Verified against `shadcn@latest` (needs a `components.json`):

```sh
npx shadcn@latest add https://williamzujkowski.github.io/remarque/registry/shadcn/essay.json
```

or, with `"registries": { "@remarque": "https://williamzujkowski.github.io/remarque/registry/shadcn/{name}.json" }`
in `components.json`:

```sh
npx shadcn@latest add @remarque/essay
```

The CLI copies files only; import the stylesheet after `remarque-tokens`
yourself. The chrome items (`skip-link`, `breadcrumb`, `pager`, `tags`)
share one `chrome.css`, so adding several writes the same file. The
validating schemas are vendored from shadcn in `scripts/vendor/` and
enforced in `scripts/test-registry.mjs`. The package export
`remarque-tokens/registry/shadcn/essay` resolves via the existing
`./registry/*` wildcard.

**What this deliberately is NOT.** No Remarque-specific installer — there
is no `npx remarque-registry add essay` command (the shadcn CLI above is
the optional install path for the Tailwind/Astro subset; the
`remarque:contract` items carry no `files[].target`). An agent's expected workflow
is fetch the JSON, read `usage.html`/the CSS `content`, and apply it with
its own editing tools — the registry replaces transcription-from-prose,
not an installer. No archetype "starter-page" items this round: the
issue floated one per archetype (Essay, Dossier, Notebook, ...) as an
IF-cheap extra, and the honest call is SKIP — archetype pages live as
demo-specific Astro files (`site/src/pages/**`), not as a reusable
module with one canonical markup sample the way the four shipped items
are, so extracting one would mean inventing a new "canonical" sample
rather than single-sourcing an existing one.

**Fetching it.** The demo site serves the registry the same way it
serves `tokens.json` (`site/scripts/copy-tokens-json.mjs`, extended):

- Index: **https://williamzujkowski.github.io/remarque/registry.json**
- Per-item: **https://williamzujkowski.github.io/remarque/registry/essay.json**
  (and `broadsheet.json`, `forms.json`, `palette-deck.json`)
- Schemas: **https://williamzujkowski.github.io/remarque/registry-item.schema.json**,
  **https://williamzujkowski.github.io/remarque/registry.schema.json**

npm package exports mirror the same paths: `remarque-tokens/registry.json`,
`remarque-tokens/registry/essay` (the `./registry/*` subpath maps to
`./registry/*.json`), `remarque-tokens/registry-item.schema.json`,
`remarque-tokens/registry.schema.json`.

---

## Signature Moves

These are the repeatable visual tells that make a Remarque site recognizable:

- The remarque mark: a small muted fleuron closing every essay (`.remarque-endmark`) — the namesake made visible, one per essay, never decorated further
- Serif hero/page titles (Newsreader at display scale; display weight bumps one step in dark mode to keep serif hairlines alive)
- Mono metadata rows beneath titles
- Constrained body width with generous margins
- Subtle `1px` section dividers using `--color-border`
- Quiet, understated footer
- Minimal accent color (one hue, used sparingly)
- Generous top padding before the main heading (`--space-9` or `--space-10`)
- Code and file path motifs rendered in mono at meta size

---

## Acceptance Criteria

An implementation succeeds when:

- The site is comfortable to read for extended periods
- Typography is the most memorable part of the design
- The design feels cohesive across all pages
- Technical details feel native to the aesthetic, not bolted on
- The result is distinctive without being gimmicky
- The mobile version is roomy and readable — not a compressed desktop layout
- A reader could identify it as a Remarque site without being told

---

## Governance & Deprecation

Remarque is small enough that governance fits on a page, but it now ships as a published npm package with multiple consuming sites and a CI gate other repos call into — enough surface that the rules deserve writing down rather than living only in maintainer habit. The precedent here is deliberately modest: closer to how a single-maintainer Carbon or Polaris component documents its own contract than to either project's full RFC process.

### Semver contract

Remarque ships as a CSS token system, not an application — "breaking" means something different than it does for a library with a JS API surface:

- **MAJOR** — a token is **removed** or **renamed**. Anything a consumer's `var(--color-x)` or a `tokens.json` lookup resolves today must keep resolving after a minor or patch bump; only a major bump may take that away.
- **MINOR** — a token's **value changes**, or a token is **added**. Value changes always carry a stated rationale in the CHANGELOG entry (a contrast fix, a gamut correction, an upstream dataset repin) — the change is minor because the *name* stays stable and every consumer reads it through `var()` indirection, but it is never silent. Additive changes (new tokens, new optional CLI flags, new subpath exports) are minor by definition — nothing existing changes shape.
- **PATCH** — tool/script fixes with no token or CSS output change (a `remarque-audit` parser bug, a `tokens-json.mjs` generation fix, a fixture correction). If `tokens.json`/`tokens.d.ts`'s content is byte-identical before and after, it's a patch.
- **MINOR (browser-floor case)** — a change that raises the *minimum supported browser version* by adopting a newer CSS mechanism as load-bearing (0.24.0's `light-dark()`/`color-scheme` migration, issue #95, is the first instance). Still a minor, not a major: no token is removed or renamed, and every consumer's `var(--color-x)`/`tokens.json` lookup keeps resolving — only the rendering environment required to resolve it *correctly* changes. The new floor is stated prominently in both the CHANGELOG entry and the relevant REMARQUE.md section, not buried in prose.

The project is still pre-1.0 — under strict SemVer every 0.x release is technically allowed to break anything — but every release to date has in practice held to the contract above (no token has ever been removed or renamed; see the version history in CHANGELOG.md). 1.0 is the point where that becomes a promise instead of an observed pattern.

### Deprecation windows

A token or convention slated for removal is announced in the CHANGELOG at least one MINOR release before it disappears, named explicitly with a target version — not left implicit in a commit message. The table below is the centralized registry of every open sunset commitment; a PR that adds a new one should add a row here in the same commit, not just mention it once in the CHANGELOG.

| Deprecated / bridged item | Introduced | Sunset target | Rationale |
|---|---|---|---|
| `:root.dark` compatibility selector (alongside canonical `[data-theme="dark"]`) | 0.5.0 | 1.0 | Bridges class-keyed consumer sites onto the attribute-keyed convention `remarque-audit` treats as canonical — the audit already parses both forms, so the bridge costs nothing today. `color-scheme` + `light-dark()` — once "the platform endgame to watch" — landed in 0.24.0 (see "Color Scheme & light-dark()"); the bridge itself is unaffected, carrying a `color-scheme: dark` override now instead of a full color list, and its sunset target is unchanged. |

No other open sunset commitments exist as of this writing (grepped against REMARQUE.md and CHANGELOG.md for "sunset"/"deprecated"). This table is meant to be the single place to look — but only if every future commitment is added here, not just announced in passing.

### Decision-log habit

Every design decision with more than one reasonable answer — a token value, a deviation from a cited precedent (Butterick, Carbon, USWDS), a scope change to an in-flight issue — gets a recorded vote, not just an implementation. The convention has been practiced since 0.5.0; this section states it as policy rather than leaving it implicit:

- The CHANGELOG entry for the release states the vote count (e.g. "ratified 3-0 by consensus panel") and, when the outcome wasn't unanimous or shipped with conditions, what those conditions were.
- REMARQUE.md carries the same treatment inline wherever a deviation is asserted against upstream guidance — see "Lineage: Butterick's Five Rules" below for the fullest example: the guidance, the deviation, the argued rationale, and the ratification line together.
- The habit exists so a future maintainer — human or agent — can tell the difference between "nobody thought about this" and "this was considered and decided," without reconstructing the reasoning from a diff.

---

## What Remarque Is Named For

In fine art printmaking, a *remarque* is a small original drawing made by the artist in the margin of a print. Found only in limited proof editions, the remarque is the mark that says: this was made by a specific person, with intention, by hand.

This system carries that idea forward. Every site built with Remarque should feel like it was made by someone who cares about how words sit on a page.
