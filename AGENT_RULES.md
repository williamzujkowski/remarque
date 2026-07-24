# Remarque — Agent Rules

**This document is the implementation contract for any agent (AI or human) building with the Remarque design system.**

Read `REMARQUE.md` first for the full system specification. This file tells you *how to build*, not *what the system is*.

---

## Prefer the Registry Over Transcribing Prose

For the Essay Module, the Broadsheet pattern, and Forms (`remarque-tokens/essay`, `remarque-tokens/broadsheet`, `remarque-tokens/forms`), a machine-readable markup-contract registry ships alongside the spec (REMARQUE.md "The Registry"; issue #100). **Agents building a Remarque page SHOULD fetch the relevant registry item and apply its `usage.html`/CSS `content` verbatim, rather than re-typing the markup from this file's or REMARQUE.md's prose.**

- Fetch `https://williamzujkowski.github.io/remarque/registry/<name>.json` (`essay`, `broadsheet`, `forms`, or `palette-deck`), or read it from an installed package at `node_modules/remarque-tokens/registry/<name>.json` — same content either way.
- The known-good markup lives in `files[].content` where `type` is `"remarque:markup"`; the CSS module (if any) is in the `"remarque:css"` entry. Both are the exact, versioned, hash-pinned (`integrity`) bytes — copy them, don't re-derive them from memory.
- This exists specifically to prevent transcription bugs like #89 (a sidenote `aria-label` that drifted out of DOM order because an agent hand-copied ~80 lines of spec prose instead of applying known-good markup). Reading REMARQUE.md's prose for the *reasoning* behind a contract is still expected; reading it as the *source of the markup you type* is the failure mode the registry exists to close.
- No CLI installer ships this round — there is no `npx` command that writes these files into a project for you. Fetch the JSON, then apply the markup with your own editing tools.

---

## Build Order

Execute in this exact order. Do not skip steps. Do not reorder.

1. **Load tokens.** Import `fonts.css` then `tokens.css`, and wire Tailwind: v4 projects import `theme.css` (after `tailwindcss` and the tokens, unlayered — see Pitfall #7); v3 projects use `tailwind.config.js`. Verify fonts load correctly.

2. **Set up global typography.** Apply display, title, section, body, meta, and prose classes. Verify the type scale renders correctly at mobile and desktop widths.

3. **Build the layout shell.** Header, content container (with constrained max-widths), and footer. The shell must enforce reading widths — content should never run full-width on large screens.

4. **Implement prose styling.** Article body text, headings within prose, blockquotes, lists, inline code, links. This is the core of Remarque — get it right before touching anything else.

5. **Implement metadata components.** Mono-styled date, reading time, tags, and status labels.

6. **Build navigation and footer.** Quiet, minimal. Navigation is functional, not decorative.

7. **Only then** build supplementary UI: buttons, tags, cards (if justified), code blocks, tables.

8. **Validate readability on mobile** before adding any visual polish.

9. **Verify every page conforms** to one of the seven archetypes (Essay, Project Dossier, Notebook, Landing, Reference/Docs, Changelog, Gallery).

**Why this order matters:** Most agents build polished components first and bolt on typography later. That produces the exact aesthetic Remarque exists to prevent. Typography and prose are the foundation. Everything else is furniture.

---

## Non-Negotiable Rules

These are not guidelines. Agents must follow them literally.

### Token Tiers

- NEVER change a value in `tokens-core.css` (or its tokens' values anywhere) — core tokens are Remarque's identity; changing them means the project has forked the system
- Site personalization happens ONLY by overriding `tokens-palette.css` tokens (font slots from the approved pairings, colors, accent, `--content-reading` per the measure table) in a stylesheet loaded after the tokens
- After ANY palette change, run the audit and fix every failure before shipping — `npm run audit` inside this repo; `npx remarque-audit --palette <file> --src <dir>` in a consumer project (the npm script only exists here)
- A generated palette override (from `npx remarque-theme <light> --dark <dark>`, see REMARQUE.md "Color Providers") is regenerated, never hand-edited — if it needs to change, change the source theme slugs and re-run `remarque-theme`, don't patch the emitted CSS directly
- The DEFAULT palette in `tokens-palette.css` is bound to the upstream `remarque-light`/`remarque-dark` themes (REMARQUE.md "Color Providers" identity/serialization contract) — `node scripts/palette-golden.mjs` must stay green. Changing a default color means changing the upstream themes first (or in lockstep with the hand file), never editing `tokens-palette.css` alone to chase a design change; a value edited only on this side is drift, not personalization, and the golden gate exists to catch it

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
- Stacking order is structural, not personalization: never author a bare `z-index` number — reference `tokens-core.css`'s `--z-*` scale (`--z-base`/`--z-sticky`/`--z-dropdown`/`--z-overlay`/`--z-modal`/`--z-toast`/`--z-skip-link`). Tailwind v4 has no `--z-index-*` theme namespace, so use arbitrary values (`z-[var(--z-modal)]`) rather than bare Tailwind numbers. See REMARQUE.md "Stacking."

### Color

- Accent color is used for exactly two things: inline links and one interactive element per viewport
- Dark mode is not an inverted light mode — it must be independently tuned for readability
- Background colors use `--color-bg`, never pure white (#fff) or pure black (#000)
- State colors (`--color-error`/`--color-success`/`--color-warning`/`--color-disabled`, plus the `-subtle` banner-background companions on the first three) are for feedback moments only — form validation, status banners, disabled controls — never for decoration. The one-accent rule above still governs everything else. See REMARQUE.md "State Colors."

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
├── prose.css                 # .remarque-prose long-form styling (aggregated by tokens.css; own subpath for opt-out)
├── essay.css                 # Optional Essay module: sidenotes + sticky TOC rail (own subpath, NOT aggregated — import explicitly)
├── broadsheet.css            # Optional Broadsheet pattern: masthead, lead, entry list, post kicker (own subpath, NOT aggregated — import explicitly)
├── forms.css                 # Optional form control primitives: field/input/checkbox/radio/button, state-color wiring (own subpath, NOT aggregated — import explicitly)
├── deck.js                   # Optional Palette Deck module: switch/persist/restore between remarque-theme-generated palettes (own subpath, NOT aggregated — dependency-free ESM, no CSS of its own)
├── print.css                 # Print stylesheet (own subpath, NOT aggregated — import explicitly)
├── theme.css                 # Tailwind v4 adapter (@theme inline) — import after tailwindcss + tokens
├── tailwind.config.js        # Tailwind v3 ONLY — v4 projects use theme.css instead
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

Three further archetypes — Reference/Docs, Changelog, Gallery — are specified in REMARQUE.md but have no reference page in this repo's demo site yet; build them per spec, they follow the same file-structure conventions as the four above (e.g. `docs/[slug]`, `changelog`, `gallery` or `browse`).

### Implementation Pitfalls (learned from reference implementation)

1. **Tailwind spacing collision:** Never map Remarque's `--space-N` values onto Tailwind's default numeric spacing keys — in v4 `@theme` that means no `--spacing-9`…`--spacing-12`, and in the v3 config no `spacing: { "5"…"12" }` overrides — or `mt-12` produces 192px instead of 48px. Both shipped artifacts namespace instead: the v3 config exposes `mt-remarque-9` etc., the reference v4 `@theme` uses `--spacing-remarque-N`. Use those, or `var(--space-N)` in arbitrary values.

2. **Prose alignment:** The essay header and prose body must BOTH use centered max-width (`max-w-reading mx-auto`) to prevent misalignment. The `.content-reading` class auto-centers; match headers with `mx-auto`.

3. **Dark mode specificity:** Define `[data-theme="light"]` and `[data-theme="dark"]` overrides in addition to the `:root` defaults. Without an explicit light override, users with `prefers-color-scheme: dark` cannot toggle to light mode. Since 0.24.0 (`light-dark()` + `color-scheme`, REMARQUE.md "Color Scheme & light-dark()"), the shipped default palette's own `[data-theme="light"]` override is just `color-scheme: light` — a consumer palette that still authors the older two-declaration convention needs the fuller override this rule originally describes.

4. **Self-hosted fonts:** Replace the Google Fonts CDN link with self-hosted woff2 files + `@font-face` declarations. Use `font-display: swap` and `<link rel="preload">` for performance.

5. **GitHub Pages base path:** When deploying to a subpath (e.g., `/remarque/`), all internal links must use a base URL helper (Astro: `import.meta.env.BASE_URL`). Set `base` in your framework config.

6. **String-form @import only:** Always write `@import './tokens.css';` (string form). Tailwind v4 / Lightning CSS silently DROPS `@import url(...)` for local files — the build succeeds while the entire token cascade vanishes from the output. Verify the built CSS contains `.remarque-prose` after changing imports.

7. **Tokens must be imported unlayered (Tailwind v4):** never `@import "remarque-tokens" layer(...)`. theme.css's `@theme inline` mappings emit same-named self-referencing declarations inside `@layer theme`; the real token values win only because unlayered declarations beat layered ones. Layering the tokens makes every mapped utility circular and invalid, with no build error.

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
- [ ] Every page maps to an archetype (Essay, Dossier, Notebook, Landing, Reference/Docs, Changelog, Gallery)
- [ ] If the Essay uses sidenotes/a TOC rail (`remarque-tokens/essay`): `.remarque-sidenote-ref`/`.remarque-sidenote` alternate in strict DOM order, the rail never intrudes into `.remarque-prose`'s own measure, and the page renders correctly with `essay.css`'s `@media` block deleted (the narrow-viewport/no-JS fallback)
- [ ] If a Landing/archive page uses the Broadsheet pattern (`remarque-tokens/broadsheet`): entry numerals are generated from `data-entry-number` via `attr()` (not `counter()`), the entry list stays a `<ul>` (not `<ol>` — the numeral is `aria-hidden` and decorative), and every kicker/dateline row uses `font-variant-caps: all-small-caps`, never `text-transform: uppercase`
- [ ] If a page uses form controls (`remarque-tokens/forms`): checkboxes/radios are styled with `accent-color` only — never `appearance: none` plus a hand-drawn replacement; every control (input, button, checkbox/radio label) is ≥44×44px; validation state lives on `.remarque-field[data-state]` AND a real `aria-invalid`/`aria-describedby` pair on the input, not `data-state` alone; disabled controls use `--color-disabled`, never a state color
- [ ] If a page uses the Palette Deck (`remarque-tokens/deck`): `data-palette` is set/cleared on the same root element as `data-theme` (they compose, never conflict); the FOUC-safe restore is a synchronous classic `<script>` physically in `<head>` (never `type="module"`, which defers); the switcher control itself is a native, keyboard-operable element (e.g. `.remarque-input` `<select>`) at ≥44×44px, not a hand-rolled widget; every registered palette was generated via `remarque-theme --scope`, never hand-authored
- [ ] Mobile version is roomy — not a compressed desktop layout
- [ ] Mobile nav links have ≥44px touch targets
- [ ] No pure white or pure black backgrounds
- [ ] `npm run audit` passes (contrast, gamut, font floors, hardcoded colors)
- [ ] Muted text placed on `--color-surface` still meets 4.5:1 (check the surface pairing, not just bg)
- [ ] All transitions use the motion duration tokens (reduced-motion support depends on it)
- [ ] Skip-to-content link present and functional
- [ ] If state colors are used (error/success/warning/disabled): only for feedback moments (validation, banners, disabled controls), never decoration; every state text color and `-subtle` companion passes `npm run audit`
- [ ] No bare `z-index` numbers anywhere in the page's CSS — every stacking layer references `tokens-core.css`'s `--z-*` scale
- [ ] OG meta tags present (og:title, og:description, og:image)
- [ ] `<html lang="en">` attribute set
- [ ] The site looks more like a book than a web app
- [ ] Tailwind spacing utilities (`mt-12`, `pt-8`) produce expected values (not overridden by `@theme`)

---

## Machine-Readable Output

Two tools emit structured JSON for agents/tooling instead of colored
stdout — pass `--json` and parse stdout as a single JSON document. Exit
codes are unchanged in both cases; `--json` only changes what stdout
contains (all human progress lines, including error lines normally on
stderr, are suppressed — nothing but the JSON document is written).

### `remarque-audit --json`

```
node scripts/audit.mjs --palette <file> --src <dir> --json
npx remarque-audit --palette <file> --src <dir> --json
```

```ts
{
  version: string;       // the remarque-tokens package version running the audit
  palette: string;       // the --palette path as given
  src: string;            // the --src path as given
  passed: boolean;       // true iff failures.length === 0
  contrast: Array<{
    theme: 'light' | 'dark';
    fg: string;            // fg token name, no leading --
    bg: string;            // bg token name, no leading --
    label: string;         // human label from the CHECKS table (e.g. "primary text")
    required: number;      // minimum ratio (e.g. 4.5, 7.0, 3.0)
    actual: number | null; // computed ratio rounded to 2dp, or null if fg/bg was unresolvable
    ok: boolean;
    error?: string;        // present only when actual is null (unresolved var()/missing token)
  }>;
  gamut: Array<{
    theme: 'light' | 'dark';
    token: string;          // token name, no leading --
    value: string;          // e.g. "oklch(0.5 0.14 250)"
    ok: boolean;            // false = outside sRGB gamut (browsers will clip it)
  }>;
  srcScans: {
    fontFloor: Array<{ file: string; line: number; size: number; unit: 'rem' | 'px' }>;
    unverifiableFontSize: Array<{ file: string; line: number; snippet: string }>;
    hardcodedColors: Array<{ file: string; line: number; snippet: string }>;
    oklchLiteral: Array<{ file: string; line: number; snippet: string }>;
  };
  failures: string[];      // every failure as a human-readable message, same text the non-JSON run prints
}
```

`contrast` and `gamut` list EVERY check performed (passing and failing);
only `srcScans` and `failures` are violation-only lists, since a source
scan that finds nothing has nothing to report per line.

### `remarque-drift --json`

```
node scripts/drift-check.mjs --css-file <path> --package-dir <dir> --json
npx remarque-drift --css-file <path> --package-dir <dir> --json
```

```ts
{
  cssFile: string;
  packageDir: string;          // resolved node_modules/remarque-tokens path
  installedVersion: string;    // version of the INSTALLED remarque-tokens being checked against
  deviationDoc: string | null; // path to DESIGN-DEVIATIONS.md / DESIGN-NOTES.md, or null if none found
  passed: boolean;             // true iff fail.length === 0
  fail: Array<{ name: string; theme: 'light' | 'dark'; canonical: string; value: string }>;
  warn: Array<{ name: string; theme: 'light' | 'dark'; canonical: string; value: string; doc: string }>;
  info: Array<{ name: string; theme: 'light' | 'dark'; canonical: string; value: string }>;
  summary: { fail: number; warn: number; info: number }; // counts of distinct TOKENS with an entry, not records (one token can produce two records — light + dark)
}
```

`fail`/`warn`/`info` are one record per (token, theme) mismatch — see
`scripts/drift-check.mjs`'s doc comment and REMARQUE.md's "Token Tiers"
for the FAIL/WARN/INFO classification these mirror.

### `tokens.json` / `tokens.schema.json`

`remarque-tokens/tokens.json` is always machine-readable (no flag
needed) and now ships with a published JSON Schema — see REMARQUE.md
"DTCG Conformance" for the schema's location, the `$schema` pointer, and
the documented DTCG divergences.

---

## Installing the Skills

This package ships two Claude Code skills under the npm subpath exports
`remarque-tokens/skills/remarque` and `remarque-tokens/skills/adopt`
(resolving to `skills/remarque/SKILL.md` and `skills/remarque-adopt/
SKILL.md` in the installed package). Claude Code only discovers skills
from a project's own `.claude/skills/` (or `~/.claude/skills/`), never
from `node_modules` — copy them in explicitly, one `cp` per skill:

```bash
mkdir -p .claude/skills
cp -r node_modules/remarque-tokens/skills/remarque .claude/skills/remarque
cp -r node_modules/remarque-tokens/skills/remarque-adopt .claude/skills/remarque-adopt
```

The copies are versioned with the installed package, not auto-updating —
re-copy both after a MAJOR bump, or any time this file's
"Machine-Readable Output" shape changes.

- `remarque` — the build/review contract for pages on the current version (tier rules, archetypes, pitfalls #6/#7).
- `remarque-adopt` — the version-bump/migration playbook (this file's "Machine-Readable Output" section is its main dependency): verify the resolved version past the 0.x caret freeze, discover newly-required tokens from `remarque-audit --json`, solve missing values against the consumer's own backgrounds, classify `remarque-drift --json` output, report against a fixed PR-body contract.

---

## How to Reference This System

In prompts, issues, or agent instructions, use:

```
Build this page using the Remarque design system.
See: REMARQUE.md for specification, AGENT_RULES.md for implementation contract, tokens.css for design tokens.
```

Agents should load all three files before beginning work.
