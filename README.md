# Remarque

**A typography-first design system for editorial, technical, and personal web projects.**

[Live Demo](https://williamzujkowski.github.io/remarque/) | [Type Specimen](https://williamzujkowski.github.io/remarque/specimen/) | [Design Tokens](https://williamzujkowski.github.io/remarque/tokens/) | [Get Started](https://williamzujkowski.github.io/remarque/start/)

---

## Why Remarque?

Most developer sites inherit the visual language of SaaS dashboards or component-library defaults. Remarque is the antidote: a system rooted in book typography, editorial design, and the quiet confidence of a well-made publication.

**What makes it different:**

- **Typography is the interface** — not color, not illustration, not animation. Three fonts (Newsreader, Inter, JetBrains Mono), each with a strict role.
- **17px minimum body text** — one pixel above the industry default. The difference in reading comfort is immediate.
- **46rem reading column** — derived from the typographic standard of 45-75 characters per line.
- **OKLCH color space** — perceptually uniform. A lightness of 0.50 actually looks mid-brightness.
- **Self-hosted fonts** — no Google CDN dependency. Strict CSP. GDPR-compliant.
- **AI-native** — designed to be consumed by Claude Code, Cursor, Copilot, and other AI coding tools with zero aesthetic drift.

## Used By

- **[Remarque demo site](https://williamzujkowski.github.io/remarque/)** — the `site/` directory in this repo; reference implementation of all four demoed archetypes, deployed to GitHub Pages.
- **[williamzujkowski.github.io](https://github.com/williamzujkowski/williamzujkowski.github.io)** — flagship personal site; core-tier npm consumer (`remarque-tokens/core` from npm, hand-authored palette layer on top).
- **[tsundoku](https://github.com/williamzujkowski/tsundoku)** — bookshelf/reading-log site; full-palette npm consumer, custom terracotta "book cloth" accent hue over the default palette for its card-catalog identity.
- **[remarque-starter](https://github.com/williamzujkowski/remarque-starter)** — template repo; Astro scaffold pulling `remarque-tokens` from npm with the audit wired into CI, meant to be forked.

## Install

```bash
npm install remarque-tokens
```

```css
@import 'remarque-tokens/fonts.css';
@import 'remarque-tokens';
/* then optionally your site's palette overrides, loaded last */
```

Copy the `fonts/` woff2 files from `node_modules/remarque-tokens/fonts/` into your static assets (or serve them from wherever your bundler puts font URLs). Personalize by overriding `remarque-tokens/palette` tokens in your own stylesheet, then validate:

```bash
npx remarque-audit --palette src/styles/my-palette.css --src src
```

**Tailwind v4** projects add the shipped adapter — utilities that track the tokens through every theme switch, no value duplication:

```css
@import "tailwindcss";
@import "remarque-tokens";
@import "remarque-tokens/theme.css";
```

**Tailwind v3** projects use the shipped config (`remarque-tokens/tailwind`) instead. A machine-readable token inventory ships as `remarque-tokens/tokens.json` (generated from the CSS — core/palette tiers, light+dark values) for tooling and AI agents. Prefer copy-paste? Grab `fonts.css`, `tokens.css`, `tokens-core.css`, `tokens-palette.css`, and `fonts/` directly — `tokens.css` aggregates the two tier files, so all three CSS files travel together. Use string-form `@import './tokens.css'` only (some bundlers silently drop `@import url(...)` for local files).

## For AI Agents

Remarque includes a machine-readable implementation contract. When prompting any AI coding tool:

```
Build this page using the Remarque design system.
See: REMARQUE.md for specification, AGENT_RULES.md for implementation contract, tokens.css for design tokens.
```

The agent rules define build order, non-negotiable rules, disallowed patterns, and a quality checklist. Every decision is specified — agents don't need to guess.

Packaging for agent tooling:
- **npm exports:** `remarque-tokens/agent-rules` (→ `AGENT_RULES.md`) and `remarque-tokens/spec` (→ `REMARQUE.md`), alongside the existing `remarque-tokens/tokens.json`, so a project can point an agent at `node_modules/remarque-tokens/AGENT_RULES.md` without hardcoding a filename.
- **Claude Code skill:** [`.claude/skills/remarque/SKILL.md`](.claude/skills/remarque/SKILL.md) — triggers on "remarque" / "design system" / new-page work, loads all three files, and states the tier rules, the audit command, and the two build-time pitfalls (unlayered-token-import, string-form `@import`) that pass a green build while silently breaking.
- **Live tokens endpoint:** the demo site serves the current `tokens.json` at **https://williamzujkowski.github.io/remarque/tokens.json** — a remote agent can fetch current token values directly instead of trusting training data.

## Files

| File | Purpose |
|------|---------|
| `REMARQUE.md` | Full system specification — philosophy, visual rules, page archetypes, acceptance criteria |
| `AGENT_RULES.md` | Implementation contract — build order, non-negotiables, pitfalls, quality checklist |
| `tokens.css` | Aggregator importing the two token tiers below |
| `tokens-core.css` | Core tier — type scale, spacing, widths, radius, motion, prose styling. Never overridden |
| `tokens-palette.css` | Palette tier — font slots, colors, accent, reading measure. The sanctioned personalization surface |
| `prose.css` | `.remarque-prose` long-form styling — own subpath so sites with their own prose system can skip it |
| `scripts/audit.mjs` | `npm run audit` — enforces the spec's contrast/gamut/font-floor/no-hardcoded-color checklist |
| `fonts.css` + `fonts/` | Self-hosted @font-face declarations and woff2 files (no CDN requests) |
| `tailwind.config.js` | Tailwind CSS **v3** configuration (v4 projects use an `@theme` block instead) |
| `package.json` | npm package manifest for `remarque-tokens` |

## Three-Font System

| Role | Font | Usage |
|------|------|-------|
| **Display** | Newsreader | Page titles, hero headings, article titles. Never for body copy. |
| **Body** | Inter | Body text, UI labels, navigation, buttons. The workhorse. |
| **Mono** | JetBrains Mono | Metadata, code, timestamps, labels. Never for headings. |

## Page Archetypes

Every page conforms to one of seven archetypes:

- **Essay** — long-form writing with serif title, mono metadata, narrow reading column
- **Project Dossier** — structured project page with metadata block and architecture section
- **Notebook** — short-form notes with mono timestamps, no cards
- **Landing** — identity statement, content navigation, generous whitespace
- **Reference/Docs** — persistent nav rail, breadcrumb kicker, prev/next footer (reuses Essay's three-column shape)
- **Changelog** — mono version/date headlines, grouped Added/Changed/Fixed lists (built from Notebook's entry structure)
- **Gallery** — cover-grid pages at `--content-wide`, covers exempt from the reading-width cap (formalized from tsundoku's reference implementation)

See the [live demo](https://williamzujkowski.github.io/remarque/) for the original four archetypes in action — Reference/Docs, Changelog, and Gallery are specified in REMARQUE.md but don't yet have a demo page in this repo.

## Design Decisions

| Decision | Value | Why |
|----------|-------|-----|
| Body size | 17px | Measurably improves reading comfort over 16px default |
| Line height | 1.75 | Generous — this is what makes prose readable |
| Reading width | 46rem | ~70 chars/line at 17px Inter. Upper end of comfortable range for technical content |
| Color space | OKLCH | Perceptual uniformity. Consistent across hues without manual tuning |
| Top padding | 6rem min | The breathing room that says "this is editorial, not a dashboard" |
| Border radius | 0.5rem max | Restrained. No "friendly SaaS" over-rounding |
| Motion | 120ms/180ms | Hover and theme transitions only. No scroll-triggered, entrance, or staggered animations |

## Named For

In fine art printmaking, a *remarque* is a small original drawing made by the artist in the margin of a proof print. Found only in limited editions, it is the mark that says: this was made by someone specific, with intention.

## License

MIT
