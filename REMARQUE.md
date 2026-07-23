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
- **Theming:** Light and dark mode via the `[data-theme]` attribute (canonical; system preference + manual toggle). `:root.dark` is supported as a compatibility bridge for class-keyed sites (sunset: 1.0) — the audit parses both. Mind the specificity asymmetry: `[data-theme=\"dark\"]` is (0,1,0), `:root.dark` is (0,2,0). Platform endgame to watch: `color-scheme` + `light-dark()`
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

`--content-reading` is calibrated to the body font — 46rem gives ~70 characters per line at 17px **Inter**, but the same width in a text serif runs ~85 characters, well past comfortable. When you swap the body slot, change the measure with it (target 66–72 ch/line at `--text-body`):

| Body face | `--content-reading` | Rationale |
|-----------|--------------------:|-----------|
| Inter (default) | 46rem | ~70 ch/line at 17px |
| system-ui stack | 46rem | metrics close to Inter |
| Source Serif 4 | 40rem | ~71 ch/line — measured on williamzujkowski.github.io, the reference consumer |

This is why the measure is palette-tier: it is a property of the font choice, not of the system's identity. The *target character count* is the invariant.

---

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

- **`.remarque-prose`** uses `font-variant-numeric: oldstyle-nums proportional-nums` — text figures that sit quietly inside a sentence, the way numerals behave in well-set book prose.
- **`.text-meta`** (and anything sharing its role — dates, counts, table cells, timestamps) uses `font-variant-numeric: tabular-nums lining-nums` — full-height, fixed-width digits that align in columns and don't jitter as they change.

Never mix the two: a numeral inside running prose should never be tabular, and a numeral in a metadata row or table should never be oldstyle. Apply `.num` to any `<td>`/`<th>` holding numeric data to opt that cell into the tabular-lining register (see prose.css's table rules).

### Small Caps

`font-variant-caps: all-small-caps` — not `text-transform: uppercase` — for any label that wants a caps-like treatment. Faux uppercase renders letters at cap-height with no optical correction and reads louder than intended; true small caps render at x-height with corrected weight and spacing. `.text-label` (mono, `--text-meta`, all-small-caps, `--tracking-caps`, `--color-muted`) is the sanctioned utility. `text-transform: uppercase` is disallowed anywhere a label could use `.text-label` instead.

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

---

## Visual Rules

### Do

- Use spacious layouts with generous whitespace
- Use a slightly oversized type scale (body text at 17px minimum)
- Constrain reading widths for prose (max 46rem / ~740px)
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

Charts are not yet a first-class Remarque surface, but tools built with the system inevitably need them. Rather than inventing chart-specific tokens, map dataviz elements onto vocabulary that already exists, so a chart survives a palette swap the same way prose and chrome do:

- **Grid lines** use `--color-border` — never a separate "chart gray." Grid lines are structural, not decorative, and already have a sanctioned quiet role.
- **Axis text and tick labels** use `--font-mono` at `--text-meta`, `--color-muted` — the same register as metadata rows and captions, never the body or display face.
- **Categorical color ramp** is derived, not hand-picked: rotate hue at the accent's lightness/chroma steps — the same discipline "Changing the Accent Hue" already prescribes (fix lightness, vary hue, reduce chroma until every value clears the gamut) — producing a small hue family distinct from `--color-accent` itself, so chart color is never mistaken for the system's one interactive signal.
- That ramp must be **audit-validated**, exactly like a palette override: every ramp color needs to clear gamut and 4.5:1 contrast against `--color-bg`/`--color-surface` in both themes before it ships.

**Precedent:** [tsundoku](https://github.com/williamzujkowski/tsundoku) built the underlying pattern already — its `DESIGN-NOTES.md` documents an 8-hue "orthogonal category system" (`--pop-pink`/`--pop-blue`/`--pop-green`/etc.), kept deliberately separate from `--color-accent` and used for content taxonomy (book categories, reading status) rather than interactivity. It held those hues to roughly the same lightness/contrast discipline as its audited palette, but by its own admission the hues were **never run through `remarque-audit`'s `CHECKS` array** — that is the one gap this guidance closes. A dataviz ramp should follow tsundoku's separation-from-accent instinct, but unlike its precedent, it must pass the audit before it ships.

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

## USWDS Accessibility Compliance

Remarque adopts typography and accessibility standards from the [US Web Design System (USWDS)](https://designsystem.digital.gov/documentation/accessibility/) and [WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/):

### Font Size Floors

| Token | Value | USWDS Rationale |
|-------|-------|-----------------|
| `--text-body` | 17px (1.0625rem) | Exceeds [USWDS 16px minimum](https://designsystem.digital.gov/components/typography/). Non-negotiable floor. |
| `--text-meta` | 14px (0.875rem) | USWDS minimum for small text. Used sparingly for metadata, labels, captions. |
| `--text-micro` | 13px (0.8125rem) | USWDS floor for timestamps and fine print only. Never for body content. |

### Contrast Ratios (WCAG 2.1 AA)

| Pairing | Requirement | Notes |
|---------|-------------|-------|
| Normal text on background | 4.5:1 minimum | [WCAG 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) — all text below 24px regular / 18.5px bold. Applies on `--color-surface` too, not just `--color-bg` |
| Large text on background | 3:1 minimum | [WCAG 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) — display and title text (24px+) |
| Functional non-text elements | 3:1 minimum | [WCAG 1.4.11](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html) — use `--color-border-bold` (meets 3:1). `--color-border` is decorative-only by design and exempt; never the sole boundary of an interactive element |

### Touch Targets

All interactive elements (links, buttons, inputs) must have a minimum touch target of **44x44px** ([WCAG 2.5.5](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html) AAA). This applies to nav links, theme toggles, footer links, chips, and any clickable element.

### Line Height

| Context | Minimum | Remarque Value |
|---------|---------|----------------|
| Body text (running copy) | 1.5 | 1.75 |
| Meta/caption text | 1.35 | 1.5 |
| Display/heading text | 1.0 | 1.05-1.2 |

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
- [ ] Every interactive element is ≥ 44×44px (use min-height/padding, not font-size to reach the floor).
- [ ] `font-variant-numeric: tabular-nums lining-nums` on all metadata that mixes with dates/counts.
- [ ] No hardcoded hex/rgb colors — only `var(--color-*)` tokens.
- [ ] Body line-height ≥ 1.5 (Remarque target: 1.75).
- [ ] Every `--color-syntax-*` slot ≥ 4.5:1 against `--color-code-bg` in both themes (see "Syntax Highlighting").

Agents reviewing PRs should reject changes that violate any line above without explicit rationale.

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
| 4. Line length | 45–90 characters per line | `--content-reading: 46rem` ≈ 70 ch at 17px Inter; the measure-compensation table targets 66–72 ch for every approved body face | Aligned |
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
        class="remarque-sidenote-ref" aria-describedby="note-1"></a>.
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
| `>= 80rem` (wide) | Floats into the LEFT margin gutter via a Tufte-style negative-margin technique, `clear: left` stacks consecutive notes, border relaxes to decorative `--color-border` (whitespace is now the real separator) | `position: sticky` in the RIGHT rail, `.remarque-essay` becomes a 3-column grid (gutter / reading column / rail) |

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
   small-caps kicker, an oversized mixed roman + italic `--font-display`
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
  `font-variant-caps: all-small-caps` — never `text-transform: uppercase`
  (the flagship predates the Small Caps rule and used uppercase
  throughout this pattern; corrected on the way upstream, same as the
  Essay Module's TOC summary).

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
downstream (contrast/gamut/font-floor audits + axe). The `9vw` rate is
unchanged from the flagship — it continues the same escalating per-tier
vw progression `tokens-core.css`'s own scale already uses (2.25vw
section → 3.5vw title → 5.5vw display), one step further for a register
one step past display. This property is declared inside `broadsheet.css`
only, never added to `tokens-core.css` — it is local arithmetic on
existing core tokens, not a new one.

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

## What Remarque Is Named For

In fine art printmaking, a *remarque* is a small original drawing made by the artist in the margin of a print. Found only in limited proof editions, the remarque is the mark that says: this was made by a specific person, with intention, by hand.

This system carries that idea forward. Every site built with Remarque should feel like it was made by someone who cares about how words sit on a page.
