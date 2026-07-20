# Remarque — Agent Rules

**This document is the implementation contract for any agent (AI or human) building with the Remarque design system.**

Read `REMARQUE.md` first for the full system specification. This file tells you *how to build*, not *what the system is*.

---

## Build Order

Execute in this exact order. Do not skip steps. Do not reorder.

1. **Load tokens.** Import `tokens.css` and configure `tailwind.config.js` with Remarque's font families and extended theme values. Verify fonts load correctly.

2. **Set up global typography.** Apply display, title, section, body, meta, and prose classes. Verify the type scale renders correctly at mobile and desktop widths.

3. **Build the layout shell.** Header, content container (with constrained max-widths), and footer. The shell must enforce reading widths — content should never run full-width on large screens.

4. **Implement prose styling.** Article body text, headings within prose, blockquotes, lists, inline code, links. This is the core of Remarque — get it right before touching anything else.

5. **Implement metadata components.** Mono-styled date, reading time, tags, and status labels.

6. **Build navigation and footer.** Quiet, minimal. Navigation is functional, not decorative.

7. **Only then** build supplementary UI: buttons, tags, cards (if justified), code blocks, tables.

8. **Validate readability on mobile** before adding any visual polish.

9. **Verify every page conforms** to one of the four archetypes (Essay, Project Dossier, Notebook, Landing).

**Why this order matters:** Most agents build polished components first and bolt on typography later. That produces the exact aesthetic Remarque exists to prevent. Typography and prose are the foundation. Everything else is furniture.

---

## Non-Negotiable Rules

These are not guidelines. Agents must follow them literally.

### Token Tiers

- NEVER change a value in `tokens-core.css` (or its tokens' values anywhere) — core tokens are Remarque's identity; changing them means the project has forked the system
- Site personalization happens ONLY by overriding `tokens-palette.css` tokens (font slots from the approved pairings, colors, accent, `--content-reading` per the measure table) in a stylesheet loaded after the tokens
- After ANY palette change, run the audit and fix every failure before shipping — `npm run audit` inside this repo; `npx remarque-audit --palette <file> --src <dir>` in a consumer project (the npm script only exists here)

### Typography

- Body text is never smaller than `--text-body` (17px / 1.0625rem)
- Prose columns never exceed `--content-reading` (46rem)
- Display/title text always uses `--font-display` (Newsreader)
- Body text always uses `--font-body` (Inter)
- Mono text is *only* for: metadata, code, labels, timestamps, technical accents
- Line height for body text is `--leading-body` (1.75) — never less

### Layout

- No page shows more than 3 content sections above the fold
- The first screen contains only: title, metadata, and the start of content
- Top padding before the main heading is at least `--space-9` (6rem)
- The site uses a **single centered column** layout: BaseLayout constrains all content to `content-standard` (72rem) centered. Individual pages do NOT set their own outer width constraints.
- Within the centered column, use `.content-reading` for prose-width sections (46rem, auto-centered within the 72rem column)
- Do NOT use Tailwind's `max-w-reading` or `max-w-standard` on page sections — these only set max-width without centering. Use the CSS classes `.content-reading` / `.content-standard` instead, which include `margin-inline: auto`
- Code blocks (`<pre>`) inherit the width of their parent container — no special wrapping needed when the parent is already constrained

### Color

- Accent color is used for exactly two things: inline links and one interactive element per viewport
- Dark mode is not an inverted light mode — it must be independently tuned for readability
- Background colors use `--color-bg`, never pure white (#fff) or pure black (#000)

### Components

- No component should be visually louder than the content it contains
- Borders use `--color-border` at 1px — never thicker, never drop shadows as replacements
- `--color-border` is decorative-only (below the 3:1 non-text minimum by design). Boundaries of interactive elements (inputs, dialogs, active states) use `--color-border-bold`, which meets WCAG 1.4.11
- Border radius never exceeds `--radius-md` (0.5rem / 8px)
- Buttons are quiet: text-only or subtle bordered. Never filled/solid as default.

### Motion

- Motion is permitted *only* on: hover states, focus rings, theme transitions
- Duration is `--motion-fast` (120ms) for micro-interactions, `--motion-normal` (180ms) for transitions
- No scroll-triggered, entrance, staggered, or parallax animations. Ever.
- All motion must respect `prefers-reduced-motion` — always use the duration tokens (tokens.css zeroes them under reduced motion); never hardcode durations

### Images

- Images stay within `--content-reading` width (diagrams may use `--content-standard`)
- Images get a 1px `--color-border` border, never shadows
- Captions use `--font-mono` at `--text-meta` size
- No decorative images. Every image serves the content.

---

## Decision Protocol

When you face a design choice not explicitly covered above, apply these filters in order:

1. **Is it more readable?** → Choose that.
2. **Is it more typographically disciplined?** → Choose that.
3. **Is it quieter?** → Choose that.
4. **Is it more tokenized/reusable?** → Choose that.
5. **Does it have less visual noise?** → Choose that.

If you are still unsure, choose the option that looks more like a well-typeset book and less like a web application.

---

## Disallowed Patterns

Do not introduce any of the following unless the project owner explicitly requests them:

- Material Design visual language (elevation, ripple, FAB)
- Large decorative gradients
- Glassmorphism / frosted glass
- Card grids as primary layout
- Over-rounded corners (border-radius > 0.5rem)
- "Friendly SaaS" visual language
- Flashy or attention-seeking motion
- Dense admin/dashboard layouts
- Full-width prose on screens wider than 768px
- Hero images or banners
- Multiple CTAs on a single page
- Feature comparison grids
- Newsletter popups or modals
- Hamburger menus on desktop
- Sticky headers that consume vertical space
- Social share buttons in content areas
- Pill-shaped tag badges (use plain mono text)
- Skeleton loading screens (use a simple spinner or nothing)

---

## File Structure Convention

```
project/
├── fonts.css                 # Self-hosted @font-face declarations (import before tokens)
├── tokens.css                # Aggregator — imports the two tiers below
├── tokens-core.css           # CORE tier: type scale, spacing, widths, radius, motion, prose machinery. NEVER override
├── tokens-palette.css        # PALETTE tier: font slots, colors, accent, reading measure. Override freely, then run the audit
├── tailwind.config.js        # Tailwind v3 ONLY — v4 projects skip this and use an @theme block (see site/src/styles/globals.css)
├── public/
│   └── fonts/                # Self-hosted woff2 fonts (Inter, Newsreader, JetBrains Mono)
├── styles/
│   ├── globals.css           # @import "tailwindcss"; @import "./tokens.css"; @font-face declarations
│   ├── prose.css             # Article/essay body text styling (or use .remarque-prose from tokens.css)
│   └── components.css        # Component-specific styles (minimal)
├── components/
│   ├── Layout.{jsx,astro}    # Layout shell (header + content + footer + skip-link + theme toggle)
│   ├── Nav.{jsx,astro}       # Navigation (content pages + design system docs)
│   ├── Footer.{jsx,astro}    # Footer
│   ├── Meta.{jsx,astro}      # Metadata row component
│   └── Prose.{jsx,astro}     # Prose wrapper (<div class="remarque-prose content-reading">)
└── pages/
    ├── index                 # Landing archetype
    ├── writing/[slug]        # Essay archetype
    ├── projects/[slug]       # Project Dossier archetype
    └── notes                 # Notebook archetype
```

### Implementation Pitfalls (learned from reference implementation)

1. **Tailwind spacing collision:** Never map Remarque's `--space-N` values onto Tailwind's default numeric spacing keys — in v4 `@theme` that means no `--spacing-9`…`--spacing-12`, and in the v3 config no `spacing: { "5"…"12" }` overrides — or `mt-12` produces 192px instead of 48px. Both shipped artifacts namespace instead: the v3 config exposes `mt-remarque-9` etc., the reference v4 `@theme` uses `--spacing-remarque-N`. Use those, or `var(--space-N)` in arbitrary values.

2. **Prose alignment:** The essay header and prose body must BOTH use centered max-width (`max-w-reading mx-auto`) to prevent misalignment. The `.content-reading` class auto-centers; match headers with `mx-auto`.

3. **Dark mode specificity:** Define `[data-theme="light"]` and `[data-theme="dark"]` overrides in addition to the `:root` defaults. Without an explicit light override, users with `prefers-color-scheme: dark` cannot toggle to light mode.

4. **Self-hosted fonts:** Replace the Google Fonts CDN link with self-hosted woff2 files + `@font-face` declarations. Use `font-display: swap` and `<link rel="preload">` for performance.

5. **GitHub Pages base path:** When deploying to a subpath (e.g., `/remarque/`), all internal links must use a base URL helper (Astro: `import.meta.env.BASE_URL`). Set `base` in your framework config.

6. **String-form @import only:** Always write `@import './tokens.css';` (string form). Tailwind v4 / Lightning CSS silently DROPS `@import url(...)` for local files — the build succeeds while the entire token cascade vanishes from the output. Verify the built CSS contains `.remarque-prose` after changing imports.

---

## Quality Checklist

Before considering any implementation complete, verify:

- [ ] Fonts load: Newsreader for display, Inter for body, JetBrains Mono for meta
- [ ] Fonts are self-hosted (no Google CDN requests in network tab)
- [ ] Body text is ≥17px on all viewports
- [ ] Prose column is ≤46rem on desktop
- [ ] Prose header and body are aligned (both centered with `mx-auto` or both left-aligned)
- [ ] Line height for body text is 1.75
- [ ] Dark mode is readable and independently tuned (not just inverted)
- [ ] Theme toggle works in both directions (light→dark AND dark→light)
- [ ] No page has more than 3 content sections above the fold
- [ ] Top padding before main heading is ≥6rem
- [ ] Accent color appears in ≤2 roles per viewport
- [ ] No scroll-triggered or entrance animations exist
- [ ] Every image has a 1px border and mono caption
- [ ] Every page maps to an archetype (Essay, Dossier, Notebook, Landing)
- [ ] Mobile version is roomy — not a compressed desktop layout
- [ ] Mobile nav links have ≥44px touch targets
- [ ] No pure white or pure black backgrounds
- [ ] `npm run audit` passes (contrast, gamut, font floors, hardcoded colors)
- [ ] Muted text placed on `--color-surface` still meets 4.5:1 (check the surface pairing, not just bg)
- [ ] All transitions use the motion duration tokens (reduced-motion support depends on it)
- [ ] Skip-to-content link present and functional
- [ ] OG meta tags present (og:title, og:description, og:image)
- [ ] `<html lang="en">` attribute set
- [ ] The site looks more like a book than a web app
- [ ] Tailwind spacing utilities (`mt-12`, `pt-8`) produce expected values (not overridden by `@theme`)

---

## How to Reference This System

In prompts, issues, or agent instructions, use:

```
Build this page using the Remarque design system.
See: REMARQUE.md for specification, AGENT_RULES.md for implementation contract, tokens.css for design tokens.
```

Agents should load all three files before beginning work.
