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

- **CSS framework:** Tailwind CSS — v4 via an `@theme` block written from tokens.css values (reference: `site/src/styles/globals.css`), or v3 via the shipped `tailwind.config.js`. One mechanism per project, never both.
- **Component primitives:** shadcn/ui (when reusable components are needed)
- **Markup:** Semantic HTML with ARIA landmarks
- **Theming:** Light and dark mode via `[data-theme]` attribute (system preference + manual toggle)
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

No page should show more than three distinct content sections above the fold. The first screen of any page contains only: title, metadata, and the opening of content. Hero sections with CTAs, feature grids, and social proof are not part of Remarque's vocabulary.

---

## Image Treatment

Remarque is typography-first, but projects include screenshots, architecture diagrams, and terminal captures. These follow strict rules:

- Images sit within the reading column width (max `--content-reading`), never wider
- Images receive a 1px border using `--color-border` — never drop shadows
- Captions use mono text (`--font-mono`) at `--text-meta` size
- Architecture diagrams and terminal captures may extend to `--content-standard` width
- No rounded corners on images beyond `--radius-sm`
- Images are never decorative — every image must serve the content

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

**Reduced motion:** all motion must respect `prefers-reduced-motion` (WCAG 2.3.3). Because every sanctioned transition uses the two duration tokens, tokens.css zeroes `--motion-fast`/`--motion-normal` under `prefers-reduced-motion: reduce` — motion authored with the tokens is automatically safe. Never hardcode durations; any future opt-in animation must live inside a `(prefers-reduced-motion: no-preference)` query.

---

## USWDS Accessibility Compliance

Remarque adopts typography and accessibility standards from the US Web Design System (USWDS) and WCAG 2.1:

### Font Size Floors

| Token | Value | USWDS Rationale |
|-------|-------|-----------------|
| `--text-body` | 17px (1.0625rem) | Exceeds USWDS 16px minimum. Non-negotiable floor. |
| `--text-meta` | 14px (0.875rem) | USWDS minimum for small text. Used sparingly for metadata, labels, captions. |
| `--text-micro` | 13px (0.8125rem) | USWDS floor for timestamps and fine print only. Never for body content. |

### Contrast Ratios (WCAG 2.1 AA)

| Pairing | Requirement | Notes |
|---------|-------------|-------|
| Normal text on background | 4.5:1 minimum | All text below 24px regular / 18.5px bold. Applies on `--color-surface` too, not just `--color-bg` |
| Large text on background | 3:1 minimum | Display and title text (24px+) |
| Functional non-text elements | 3:1 minimum | WCAG 1.4.11 — use `--color-border-bold` (meets 3:1). `--color-border` is decorative-only by design and exempt; never the sole boundary of an interactive element |

### Touch Targets

All interactive elements (links, buttons, inputs) must have a minimum touch target of **44x44px** (WCAG 2.5.5 AAA). This applies to nav links, theme toggles, footer links, chips, and any clickable element.

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

Agents reviewing PRs should reject changes that violate any line above without explicit rationale.

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

Every page built with Remarque must conform to one of these four archetypes. Agents and implementers should not invent new page structures.

### Essay

Long-form writing. The core content type.

**Always includes:**
- Large serif title (Newsreader, `--text-display` or `--text-title`)
- Mono metadata row (date, reading time, tags)
- Narrow reading column (`--content-reading`)
- Strong prose styling with generous line height
- Low-noise footer navigation (previous/next)

**Optionally includes:**
- Side table of contents on desktop (outside reading column)

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

**Never includes:**
- Hero images or banners
- Multiple CTAs
- Feature grids
- Testimonial carousels
- Newsletter signup forms above the fold

---

## Signature Moves

These are the repeatable visual tells that make a Remarque site recognizable:

- Serif hero/page titles (Newsreader at display scale)
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
