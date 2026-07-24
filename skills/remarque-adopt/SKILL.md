---
name: remarque-adopt
description: >
  Run the remarque-tokens consumer-conformance playbook — the exact
  procedure for bumping a project's remarque-tokens pin and getting back
  to a passing audit. Use when the user says "bump remarque-tokens",
  "upgrade the design system", "adopt remarque in an existing site",
  "update to the latest remarque-tokens", or when `remarque-audit`/`npm
  run audit` starts failing after a version bump (missing-token
  failures). Distinct from the `remarque` skill, which is the
  build/review contract for pages already on the current version — load
  this one specifically for the migration itself, then defer to
  `remarque` for any actual page work the migration surfaces.
license: MIT
---

# remarque-adopt

Five steps, each ending in a machine gate. This codifies the playbook run
across williamzujkowski.github.io#381, tsundoku#243/#237, and
remarque-starter#7/#8 — read one of those PR bodies for the fullest worked
example if a step below is unclear.

## 1. Bump the pin

Bump `remarque-tokens` in `package.json`, install, then **verify the
RESOLVED version, not the range you typed.** This package is pre-1.0:
caret ranges (`^0.NN.0`) never cross a minor below 1.0 (npm's own rule —
`^0.24.0` means `>=0.24.0 <0.25.0`), so a stale `^0.1x.0` pin silently
freezes a site for dozens of releases (remarque-starter#7 was frozen at
0.10.x through 0.18.0). Bump the pin's own minor to the target, don't
just re-run install against the old range.

- Gate: `npm ls remarque-tokens` (or your lockfile) shows the exact
  target version resolved — not just "install succeeded." A
  lockfile-verified install (`npm ci` after committing the lockfile
  change, not a bare `npm install` you never diff) is the acceptance;
  see the panel's security condition in AGENT_RULES.md.

## 2. Discover what's newly required — mechanically

Do not read the CHANGELOG and guess which tokens are new. Run the audit
against the site's current palette and let it tell you:

```
npx remarque-audit --palette <your-palette-file> --src <dir> --json
```

Parse `failures` (and `srcScans`) from the JSON — every missing/failing
token family the new version requires shows up here. See
AGENT_RULES.md's "Machine-Readable Output" for the full shape.

- Gate: you have a concrete list of failing checks, not an impression
  from prose.

## 3. Add the missing tokens — solved against THIS site's backgrounds

Start from the package's own default values (`tokens-palette.css` /
`tokens.json` in the target version) and add them to every theme block
the site's palette maintains. **Keep-if-passing:** if a default value
already clears its required ratio against *this site's own*
`--color-bg`/`--color-surface`/`--color-code-bg` (not the package demo's),
keep it verbatim — most slots need no change at all (tsundoku#237: 16 of
16 new tokens were the package default byte-for-byte). Only re-solve a
value when the site's own backgrounds make the default fail (flagship#381:
1 of 13 tokens needed a new lightness because that site's surface sits
closer to its bg than the package demo's does).

**Hue collisions are a second, distinct failure mode from contrast** —
check for them even when contrast passes. A new categorical/state hue can
land visually on top of a site's own accent or another semantic color.
Worked example, tsundoku#243: the default viz "red" (H24.6 light / H25.4
dark) sat almost on top of both tsundoku's terracotta accent (H35) and its
`--color-error` (H25/H26) — a chart category would have read as "the
accent" or "an error." Rotated to H350 (rose-red) in each theme
independently, re-solving lightness to hold the same contrast band the
untouched slots hit.

- **Acceptance is pinned to the audit output, not agent judgment.** This
  step ends when:
  ```
  npx remarque-audit --palette <file> --src <dir> --json
  ```
  reports `passed: true`. Not "looks close," not "should be fine" — the
  JSON's `passed` field, checked.

## 4. Run the drift check

```
npx remarque-drift --css-file <your-palette-file> --package-dir . --json
```

Classify every record per REMARQUE.md "Token Tiers" / AGENT_RULES.md
"Machine-Readable Output":

| Class | Tier | Meaning | Action |
|---|---|---|---|
| `fail` | core | Undocumented core-tier override — the site has forked Remarque | Fix: revert to the core value (never ship a FAIL) |
| `warn` | core | Core-tier override, but the token name is mentioned in a `DESIGN-DEVIATIONS.md`/`DESIGN-NOTES.md` in the consumer | Ratified, documented deviation — not a build failure, but still surfaced |
| `info` | palette | Palette-tier divergence from the package default | Sanctioned personalization — expected, not an error |

Any new palette-tier value from step 3 that differs from the package
default (the tsundoku hue rotation, the flagship lightness re-solve) will
show up as `info` — that's correct, not a regression. If a value must
diverge from a *core*-tier token (rare, and usually means step 3 touched
the wrong tier), record it under a `--token-name` heading in the
project's `DESIGN-DEVIATIONS.md` (or `DESIGN-NOTES.md`) *before* running
drift again, so it reclassifies from `fail` to `warn`.

- Gate: `passed: true` (zero `fail` records). `warn`/`info` never block.

## 5. PR body contract

Report, in this order — every consumer PR in the source list follows this
shape:

1. **What changed** — old pin → new pin, which token families were added and why (which version introduced the audit requirement).
2. **Token decisions** — a table of any value that needed solving (not kept-as-default), with the before/after values and the contrast numbers that justified the change. Note any hue collision found and how it was resolved, even if unrelated to contrast.
3. **Drift summary** — the `summary: {fail, warn, info}` counts, with a one-line explanation of any non-zero `warn`.
4. **Gate results** — the project's own full local suite (typecheck/tests/build) plus this playbook's two gates (audit `passed: true`, drift `fail: 0`), each stated as pass/fail, not just "ran."
5. **Anything explicitly declined** — a new token family evaluated but not adopted into existing UI (tsundoku#243 declined recoloring an ordinal chart with new categorical hues), or a related upgrade opportunity noted but out of scope for this bump.

If any of steps 2-4's gates don't pass, the PR isn't ready — this
playbook has no "close enough."
