# Remarque

**A typography-first design system for editorial, technical, and personal web projects.**

[Live Demo](https://williamzujkowski.github.io/remarque/) | [Type Specimen](https://williamzujkowski.github.io/remarque/specimen/) | [Design Tokens](https://williamzujkowski.github.io/remarque/tokens/) | [Get Started](https://williamzujkowski.github.io/remarque/start/)

---

## Why Remarque?

Most developer sites inherit the visual language of SaaS dashboards or component-library defaults. Remarque is the antidote: a system rooted in book typography, editorial design, and the quiet confidence of a well-made publication.

**What makes it different:**

- **Typography is the interface** — not color, not illustration, not animation. Three fonts (Newsreader, Inter, JetBrains Mono), each with a strict role.
- **17px minimum body text** — one pixel above [USWDS's 16px floor](https://designsystem.digital.gov/components/typography/) for body text. A judgement call for extended reading, not a measured threshold.
- **38rem reading column** — ~71 measured characters per line at 17px Inter, inside the 45–75 range [Bringhurst gives for a single-column page](https://webtypography.net/2.1.2) (and Butterick's 45–90).
- **OKLCH color space** — built on [Oklab](https://bottosson.github.io/posts/oklab/), which its author designed to do "a good job at predicting perceived lightness, chroma and hue". That makes tuning contrast by lightness practical; the contrast gate is still computed WCAG 2.x ratios.
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

Add `--json` to either `remarque-audit` or `remarque-drift` for a single structured JSON document on stdout instead of colored console output (exit codes unchanged) — for agents and CI tooling to parse rather than scrape. Shape documented in `AGENT_RULES.md` ("Machine-Readable Output").

**Tailwind v4** projects add the shipped adapter — utilities that track the tokens through every theme switch, no value duplication:

```css
@import "tailwindcss";
@import "remarque-tokens";
@import "remarque-tokens/theme.css";
```

**Tailwind v3** projects use the shipped config (`remarque-tokens/tailwind`) instead. A machine-readable token inventory ships as `remarque-tokens/tokens.json` (generated from the CSS — core/palette tiers, light+dark values) for tooling and AI agents, with a published JSON Schema at `remarque-tokens/tokens.schema.json` (also referenced by tokens.json's own `$schema` field) so tooling can validate it structurally instead of hand-parsing. tokens.json is conformant in spirit with the [Design Tokens Community Group](https://www.designtokens.org/) format (`$value`/`$type` on every token), with three deliberate divergences (oklch() color strings, per-token light/dark nesting, CSS-string dimension/duration values) — see REMARQUE.md's "DTCG Conformance" section. Prefer copy-paste? Grab `fonts.css`, `tokens.css`, `tokens-core.css`, `tokens-palette.css`, and `fonts/` directly — `tokens.css` aggregates the two tier files, so all three CSS files travel together. Use string-form `@import './tokens.css'` only (some bundlers silently drop `@import url(...)` for local files).

## For AI Agents

Remarque includes a machine-readable implementation contract. When prompting any AI coding tool:

```
Build this page using the Remarque design system.
See: REMARQUE.md for specification, AGENT_RULES.md for implementation contract, tokens.css for design tokens.
```

The agent rules define build order, non-negotiable rules, disallowed patterns, and a quality checklist. Every decision is specified — agents don't need to guess.

Packaging for agent tooling:
- **npm exports:** `remarque-tokens/agent-rules` (→ `AGENT_RULES.md`) and `remarque-tokens/spec` (→ `REMARQUE.md`), alongside the existing `remarque-tokens/tokens.json`, so a project can point an agent at `node_modules/remarque-tokens/AGENT_RULES.md` without hardcoding a filename.
- **Claude Code skills (three):**
  - [`.claude/skills/remarque/SKILL.md`](.claude/skills/remarque/SKILL.md) — triggers on "remarque" / "design system" / new-page work, loads all three files, and states the tier rules, the audit command, and the two build-time pitfalls (unlayered-token-import, string-form `@import`) that pass a green build while silently breaking.
  - [`.claude/skills/remarque-adopt/SKILL.md`](.claude/skills/remarque-adopt/SKILL.md) — triggers on "bump remarque-tokens" / "upgrade the design system" / "adopt remarque in an existing site" / an audit that starts failing after a version bump. The consumer-conformance playbook (issue #107): verify the resolved version past the 0.x caret freeze, discover newly-required tokens from `remarque-audit --json` mechanically, solve missing values against the *consumer's own* backgrounds (keep-if-passing), classify `remarque-drift --json` output (FAIL/WARN/INFO), and report against a fixed PR-body contract. Every step ends in a machine gate — `passed: true`, not agent judgment.
  - [`.claude/skills/remarque-new-page/SKILL.md`](.claude/skills/remarque-new-page/SKILL.md) — triggers on "new page" / "add a page" / "build an essay/archive/landing page" / "use an archetype". A companion to the `remarque` loader skill, not a parallel restatement of it: pick the archetype from REMARQUE.md, fetch the relevant registry item and verify its sha256 against the `registry.json` pin before applying it (issue #89's transcription-bug prevention), wire the page per AGENT_RULES pitfalls, and gate acceptance on `remarque-audit --json` plus the registry item's own markup-contract assertions (issue #108).

  All three ship in the npm tarball under `skills/` (see "Installing the skills" below) as well as living at `.claude/skills/` in this repo.
- **Live tokens endpoint:** the demo site serves the current `tokens.json` at **https://williamzujkowski.github.io/remarque/tokens.json**, and its schema at **https://williamzujkowski.github.io/remarque/tokens.schema.json** — a remote agent can fetch current token values (and validate their shape) directly instead of trusting training data.
- **Markup-contract registry:** a shadcn-`registry-item.json`-shaped, version-pinned, hash-verified registry of known-good markup for the Essay/Broadsheet/Forms/Palette Deck modules — **https://williamzujkowski.github.io/remarque/registry.json** (index) and **https://williamzujkowski.github.io/remarque/registry/essay.json** (per item; also `broadsheet`/`forms`/`palette-deck`). Fetch and apply the markup instead of transcribing it from spec prose — see REMARQUE.md's "The Registry" and AGENT_RULES.md's "Prefer the Registry Over Transcribing Prose." shadcn users: `npx shadcn@latest add https://williamzujkowski.github.io/remarque/registry/shadcn/essay.json`, or register `"@remarque": "https://williamzujkowski.github.io/remarque/registry/shadcn/{name}.json"` under `registries` in `components.json` and run `npx shadcn@latest add @remarque/essay`.
- **`llms-full.txt`:** **https://williamzujkowski.github.io/remarque/llms-full.txt** — AGENT_RULES.md plus a compact token table (name, tier, light, dark) in one fetch, generated at site build time.

### Installing the skills

`npm install remarque-tokens` does not put anything into your project's
`.claude/skills/` automatically — Claude Code only reads skills from
there (or from `~/.claude/skills/`), never from `node_modules`. Copy them
in explicitly, one `cp` per skill:

```bash
mkdir -p .claude/skills
cp -r node_modules/remarque-tokens/skills/remarque .claude/skills/remarque
cp -r node_modules/remarque-tokens/skills/remarque-adopt .claude/skills/remarque-adopt
cp -r node_modules/remarque-tokens/skills/remarque-new-page .claude/skills/remarque-new-page
```

The copies are versioned with whatever `remarque-tokens` version is
installed at copy time, not auto-updating — re-run all three `cp`
commands after any MAJOR bump (and any time `AGENT_RULES.md`'s "Machine-Readable
Output" shape changes) to pick up the current playbook.

## Files

| File | Purpose |
|------|---------|
| `REMARQUE.md` | Full system specification — philosophy, visual rules, page archetypes, acceptance criteria |
| `AGENT_RULES.md` | Implementation contract — build order, non-negotiables, pitfalls, quality checklist |
| `tokens.css` | Aggregator importing the two token tiers below |
| `tokens-core.css` | Core tier — type scale, spacing, widths, radius, motion, prose styling. Never overridden |
| `tokens-palette.css` | Palette tier — font slots, colors, accent, reading measure. The sanctioned personalization surface |
| `prose.css` | `.remarque-prose` long-form styling — own subpath so sites with their own prose system can skip it. It `@import`s the three partials below |
| `dropcap.css` + `endmark.css` + `code-title.css` | The drop cap (`remarque-tokens/dropcap`, a three-line `initial-letter` cap with a derived Firefox float, `.remarque-dropcap--short` and `.no-drop-cap` for the consumer to apply), the closing fleuron (`/endmark`) and the code-block filename line (`/code-title`, 0.33). Each is its own subpath for sites with their own prose system; `prose.css` imports all three, so its consumers need nothing extra — see REMARQUE.md "Drop Caps" |
| `deck.js` + `deck/` | Palette Deck: reader-selectable terminal themes from `@williamzujkowski/oklch-terminal-themes`. `deck/deck.css` + `deck.json` are the prebuilt curated deck (15 light/dark pairs, about 8 KB gzipped), `remarque-deck` builds your own, and `deck.js` switches, persists and wires the picker. See REMARQUE.md "Palette Deck" |
| `chrome.css` | Site chrome and wayfinding (`remarque-tokens/chrome`, 0.29): skip link + `.remarque-sr-only`, breadcrumb, pager/pagination, tags — see REMARQUE.md "Chrome Module" |
| `scripts/audit.mjs` | `npm run audit` — enforces the spec's contrast/gamut/font-floor/no-hardcoded-color checklist (`--json` for structured output) |
| `scripts/drift-check.mjs` | `npx remarque-drift` — token drift check for consumers (`--json` for structured output) |
| `tokens.json` + `tokens.d.ts` | Generated machine-readable token inventory + TypeScript types (`scripts/tokens-json.mjs`) |
| `tokens.schema.json` | Generated JSON Schema (draft 2020-12) for `tokens.json`, published alongside it |
| `registry.json` + `registry/` | Generated markup-contract registry index + per-item files for essay/broadsheet/forms/skip-link/breadcrumb/pager/tags/palette-deck (`scripts/build-registry.mjs`) — see REMARQUE.md "The Registry" |
| `registry-item.schema.json` + `registry.schema.json` | Generated JSON Schemas (draft 2020-12) for the per-item and index registry files |
| `skills/remarque/SKILL.md` + `skills/remarque-adopt/SKILL.md` | Generated packaging copies of the two Claude Code skills (`scripts/build-skills.mjs`) — canonical source is `.claude/skills/*/SKILL.md`; see "Installing the skills" above |
| `fonts.css` + `fonts/` | Self-hosted @font-face declarations and woff2 files (no CDN requests); `fonts/features.json` lists each face's OpenType features for `remarque-audit`'s font-feature check |
| `tailwind.config.js` | Tailwind CSS **v3** configuration (v4 projects use an `@theme` block instead) |
| `package.json` | npm package manifest for `remarque-tokens` |

### Sizes

Gzip (level 9) / brotli (max) bytes per shipped stylesheet, enforced by `scripts/test-budget.mjs` against `budgets.json` (current size + 10%, repo-only, not in the package). Bare `remarque-tokens` imports core + palette + prose.

| File | gzip | brotli |
|------|-----:|-------:|
| `tokens.css` (effective: core + palette + prose) | 16,826 | 14,116 |
| `tokens-core.css` | 4,888 | 4,066 |
| `tokens-palette.css` | 7,145 | 5,932 |
| `prose.css` | 5,792 | 4,852 |
| `essay.css` | 7,895 | 6,671 |
| `broadsheet.css` | 7,484 | 6,259 |
| `forms.css` | 8,431 | 7,008 |
| `chrome.css` | 4,552 | 3,868 |
| `print.css` | 2,542 | 2,095 |
| `theme.css` | 1,744 | 1,452 |
| `fonts.css` | 612 | 484 |
| `deck/deck.css` | 7,836 | 6,156 |

Minimal import: `tokens-core.css` + `tokens-palette.css` alone (about 12 KB gzip) work without `prose.css`; the same test checks that every `var(--x)` in the optional modules resolves to a core or palette token.

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
| Reading width | 38rem | ~71 measured chars/line at 17px Inter (median; p90 76) |
| Color space | OKLCH | Perceptual uniformity. Consistent across hues without manual tuning |
| Top padding | 6rem min | The breathing room that says "this is editorial, not a dashboard" |
| Border radius | 0.5rem max | Restrained. No "friendly SaaS" over-rounding |
| Motion | 120ms/180ms | Hover and theme transitions only. No scroll-triggered, entrance, or staggered animations |

## Graduation — when a site invention becomes system vocabulary

Consumer sites invent things (the flagship's sidenotes and theme deck, tsundoku's gallery
grid). Some of those inventions belong upstream; most are the site's own remarque in the
margin and should stay there. A local invention is upstreamable when **all four** hold:

1. **Wanted by 2+ sites** (or one site plus a ratified case that it generalizes).
2. **Consumes only tokens** — no hardcoded colors, sizes, or faces.
3. **Passes the audit tooling** (`remarque-audit`, and `remarque-drift` reports it as
   palette-tier INFO, not a core FAIL).
4. **Violates no Never-list entry** in the spec — or arrives together with an explicit
   spec amendment arguing the change.

**Three destinations.** Core spec (rare — core is identity, the bar is a fork-level
argument); optional module (sidenotes, TOC rail, palette deck, the Broadsheet pattern); or
*documented site-local pattern* — explicitly not shared. The zine layer that inspired this
checklist is the exemplar of the third: sanctioned personality that would be diluted by
generalizing it.

**Process (single-maintainer scale, no ceremony):** open an issue with before/after
screenshots and the token-purity check; record the decision in the changelog. Historical
examples: measure compensation and the Gallery archetype graduated; the essay
sidenotes/sticky-TOC-rail pair graduated as an optional module
([#52](https://github.com/williamzujkowski/remarque/issues/52)); the theme deck was
re-scoped on the way up ([#56](https://github.com/williamzujkowski/remarque/issues/56));
the Broadsheet editorial pattern (masthead, lead article, numbered entry list, post-header
kicker) graduated as an optional pattern module
([#36](https://github.com/williamzujkowski/remarque/issues/36)); the zine layer
deliberately stayed local.

**Standing rulings** (ratified 3-0, 2026-07-23) on patterns the reviews kept re-flagging:

| Pattern | Ruling |
|---------|--------|
| Share links in post footers | Site-local, never a system module. If you build one: URL-encode every interpolated value and reject non-`https` schemes — title/frontmatter injection into share-intent URLs is the classic mistake. |
| Cross-hue hover accents | Not sanctioned anywhere. The hover move is a lightness/chroma shift within the accent hue (`--color-accent-hover` models it). A cross-hue hover is a documented deviation, not personalization. |
| Ambient/decorative animation | Site-local only, never in system modules — and the `prefers-reduced-motion` guard is mandatory, not advisory. A future audit scan may flag unguarded infinite animations (as a heuristic check, not a soundness proof). |
| Landing-page entry counts | Permitted as meta-voice data in the Landing archetype **only when computed from real inventory at build time**. A hardcoded count is a violation — counts drift (see the upstream count-drift bug class this system just fixed in its own theme provider). |

## Development

`npm test` runs every gate CI runs: the token audit, the freshness checks for the generated files (`tokens.json`, the registry, the packaged skills), the palette golden gate, and every `scripts/test-*.mjs` fixture suite, including the consumer pack smoke test, which needs the network. `.github/workflows/ci.yml` runs the same gates on every pull request on Node 22 and 24, and both the Pages deploy and the npm release `need` it, so nothing deploys or publishes from a red commit.

## Named For

In fine art printmaking, a *remarque* is a small original drawing made by the artist in the margin of a proof print. Found only in limited editions, it is the mark that says: this was made by someone specific, with intention.

## License

MIT
