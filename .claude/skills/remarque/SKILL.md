---
name: remarque
description: >
  Load the Remarque design system's implementation contract before building,
  editing, or reviewing any page in a Remarque-based project — a
  typography-first system for editorial, technical, and personal sites (17px
  body floor, three-font system, four-then-seven page archetypes, strict
  token tiers). Use when the user says "remarque", "design system", "build a
  new page", "new archetype page", "style this like the site", or asks for
  a page/component in a project that imports `remarque-tokens`. Also use
  before reviewing a PR that touches design-system tokens or page layout in
  such a project.
license: MIT
---

# Remarque

Remarque is a typography-first design system. This skill tells you which
files define it, how to load them, and the two mistakes that cause the most
downstream breakage.

## Load these three files before writing or reviewing any page

Prefer the installed package if this project depends on `remarque-tokens`;
fall back to the repo root if you are working inside `williamzujkowski/remarque`
itself.

| File | Where (consumer project) | Where (this repo) | Purpose |
|---|---|---|---|
| `AGENT_RULES.md` | `node_modules/remarque-tokens/AGENT_RULES.md` (or `remarque-tokens/agent-rules`) | `./AGENT_RULES.md` | Implementation contract — build order, non-negotiable rules, disallowed patterns, quality checklist |
| `REMARQUE.md` | `node_modules/remarque-tokens/REMARQUE.md` (or `remarque-tokens/spec`) | `./REMARQUE.md` | Full specification — philosophy, token tiers, page archetypes, acceptance criteria |
| `tokens.json` | `node_modules/remarque-tokens/tokens.json` (or `remarque-tokens/tokens.json`) | `./tokens.json` | Machine-readable token values (both themes) — read this instead of guessing a hex/oklch value from memory |

Read all three before generating code. `AGENT_RULES.md` says *how to build*;
`REMARQUE.md` says *what the system is*; `tokens.json` says *what the
current values actually are* — don't trust training data for token values,
the CSS (and this generated file) is the single source of truth and it
changes across releases.

## Tier rules (non-negotiable)

Tokens live in two tiers with different contracts — get this wrong and the
project has silently forked the system:

- **Core** (`tokens-core.css`): type scale, the 17px body floor, line
  heights, tracking, weights, spacing scale, `--content-standard` /
  `--content-wide`, radius ceiling, motion durations, prose/typography
  machinery. **Never overridden.** A project that changes a core value is
  no longer a Remarque project, by definition.
- **Palette** (`tokens-palette.css`): font slots (`--font-display/body/mono`
  — from the approved pairings only), all `--color-*`, `--content-reading`
  (the measure, which moves with the body font). **Override freely** in a
  stylesheet loaded after the tokens — this is the sanctioned
  personalization surface.

Every page must also map to one of the seven archetypes (Essay, Project
Dossier, Notebook, Landing, Reference/Docs, Changelog, Gallery) — see
`REMARQUE.md`'s "Page Archetypes" section. Do not invent an eighth.

## Audit command (run after any palette change)

- Inside this repo: `npm run audit`
- Inside a consumer project: `npx remarque-audit --palette <file> --src <dir>`

A palette change that doesn't pass the audit does not ship — contrast,
gamut, font-size floors, and hardcoded-color checks are mechanical gates,
not suggestions.

## Pitfalls #6 and #7 (the two that cause silent, buildable breakage)

These pass a normal build with no error and no warning, so verify them
explicitly rather than trusting a green build:

**#6 — String-form `@import` only.** Always write `@import './tokens.css';`
(string form). Tailwind v4 / Lightning CSS silently **drops**
`@import url(...)` for local files — the build succeeds while the entire
token cascade vanishes from the output. Verify the built CSS contains
`.remarque-prose` after changing any import.

**#7 — Tokens must be imported unlayered (Tailwind v4).** Never
`@import "remarque-tokens" layer(...)`. `theme.css`'s `@theme inline`
mappings emit same-named self-referencing declarations inside
`@layer theme`; the real token values win only because unlayered
declarations beat layered ones. Layering the tokens makes every mapped
utility circular and invalid — again, with no build error.

## When you're unsure

Apply `REMARQUE.md`'s decision protocol in order: more readable > more
typographically disciplined > quieter > more tokenized/reusable > less
visual noise. If still unsure, choose the option that looks more like a
well-typeset book and less like a web application.
