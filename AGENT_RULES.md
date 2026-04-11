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
- Content containers use `--content-reading` for prose and `--content-standard` for wider layouts

### Color

- Accent color is used for exactly two things: inline links and one interactive element per viewport
- Dark mode is not an inverted light mode — it must be independently tuned for readability
- Background colors use `--color-bg`, never pure white (#fff) or pure black (#000)

### Components

- No component should be visually louder than the content it contains
- Borders use `--color-border` at 1px — never thicker, never drop shadows as replacements
- Border radius never exceeds `--radius-md` (0.625rem)
- Buttons are quiet: text-only or subtle bordered. Never filled/solid as default.

### Motion

- Motion is permitted *only* on: hover states, focus rings, theme transitions
- Duration is `--motion-fast` (120ms) for micro-interactions, `--motion-normal` (180ms) for transitions
- No scroll-triggered, entrance, staggered, or parallax animations. Ever.

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
- Over-rounded corners (border-radius > 0.625rem)
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
├── tokens.css                # Remarque design tokens
├── tailwind.config.js        # Tailwind configuration extending tokens
├── styles/
│   ├── globals.css           # Global styles, font imports, base resets
│   ├── prose.css             # Article/essay body text styling
│   └── components.css        # Component-specific styles (minimal)
├── components/
│   ├── Layout.{jsx,astro}    # Layout shell (header + content + footer)
│   ├── Nav.{jsx,astro}       # Navigation
│   ├── Footer.{jsx,astro}    # Footer
│   ├── Meta.{jsx,astro}      # Metadata row component
│   └── Prose.{jsx,astro}     # Prose wrapper
└── pages/
    ├── index                 # Landing archetype
    ├── writing/[slug]        # Essay archetype
    ├── projects/[slug]       # Project Dossier archetype
    └── notes                 # Notebook archetype
```

---

## Quality Checklist

Before considering any implementation complete, verify:

- [ ] Fonts load: Newsreader for display, Inter for body, JetBrains Mono for meta
- [ ] Body text is ≥17px on all viewports
- [ ] Prose column is ≤46rem on desktop
- [ ] Line height for body text is 1.75
- [ ] Dark mode is readable and independently tuned (not just inverted)
- [ ] No page has more than 3 content sections above the fold
- [ ] Top padding before main heading is ≥6rem
- [ ] Accent color appears in ≤2 roles per viewport
- [ ] No scroll-triggered or entrance animations exist
- [ ] Every image has a 1px border and mono caption
- [ ] Every page maps to an archetype (Essay, Dossier, Notebook, Landing)
- [ ] Mobile version is roomy — not a compressed desktop layout
- [ ] No pure white or pure black backgrounds
- [ ] The site looks more like a book than a web app

---

## How to Reference This System

In prompts, issues, or agent instructions, use:

```
Build this page using the Remarque design system.
See: REMARQUE.md for specification, AGENT_RULES.md for implementation contract, tokens.css for design tokens.
```

Agents should load all three files before beginning work.
