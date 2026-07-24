---
name: remarque-new-page
description: >
  Build a new page in a project that consumes `remarque-tokens` — pick the
  right archetype, fetch registry items instead of transcribing markup,
  wire the page per AGENT_RULES pitfalls, and gate on remarque-audit plus
  the registry's own markup-contract assertions. Use when the user says
  "new page", "add a page", "build an essay", "build an archive page",
  "build a landing page", "use an archetype", or asks for a page in a
  Remarque-consuming project. Companion to the `remarque` loader skill —
  load that one first for the tier rules and the two build-time pitfalls;
  this skill is the page-building procedure on top of it, not a
  restatement of it.
license: MIT
---

# remarque-new-page

Five steps, each ending in a gate. This sits on top of the `remarque`
loader skill and does not restate its tier rules or pitfalls — it applies
them to the specific job of adding one new page.

## 1. Load the loader skill's three files

Run the `remarque` skill first. If skill resolution isn't available in
this context, read `AGENT_RULES.md`, `REMARQUE.md`, and `tokens.json`
yourself — see that skill's file table for the consumer-project vs.
in-repo paths. Do not build from training-data memory of token values or
tier rules; both change across releases and the current values live only
in those three files.

- Gate: you can name which tier (`core`/`palette`) governs the tokens
  this page will touch, and you have the CURRENT `tokens.json` open —
  not a cached mental model from an older version.

## 2. Pick the archetype

`REMARQUE.md`'s "Page Archetypes" section defines seven: Essay, Project
Dossier, Notebook, Landing, Reference/Docs, Changelog, Gallery. Match the
request to exactly one — "essay"/"blog post" → Essay; "archive"/"index of
posts" → Landing (often paired with the Broadsheet pattern below);
"docs"/"reference" → Reference/Docs. Do not invent an eighth.

- Gate: you can quote the chosen archetype's "Always includes"/"Never
  includes" lists from the spec, not paraphrase them from memory.

## 3. Module-backed pages: fetch the registry item, verify, apply

If the archetype uses one of the four registry-backed modules — Essay
(sidenotes/TOC rail), Broadsheet (Landing/archive pattern), Forms, or
Palette Deck — do not transcribe markup from REMARQUE.md's prose. That is
the exact failure mode issue #89 documents: a hand-copied sidenote
`aria-label` drifted out of DOM order. Fetch the item instead:

```bash
cat node_modules/remarque-tokens/registry/essay.json   # or broadsheet/forms/palette-deck
# or, if not installed locally:
curl -s https://williamzujkowski.github.io/remarque/registry/essay.json
```

Then **verify integrity before applying anything** — recompute the sha256
over the fetched item's `files[].content` and compare it to that item's
own `integrity` field (both are the pin recorded in `registry.json`'s
index):

```bash
node -e '
  const fs = require("fs"), crypto = require("crypto");
  const item = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const bytes = Buffer.from(item.files.map(f => f.content).join(""));
  console.log("sha256-" + crypto.createHash("sha256").update(bytes).digest("base64"));
' node_modules/remarque-tokens/registry/essay.json
# compare stdout, byte for byte, to that same file's "integrity" field
```

Apply `files[].content` verbatim — the `remarque:css` entry as the CSS
module, the `remarque:markup` entry's `usage.html` as the page's starting
DOM — rather than retyping either from memory.

- Gate: the computed hash matches `integrity` exactly. A mismatch means
  stop and re-fetch; never apply an unverified payload.

## 4. Wire it per AGENT_RULES pitfalls

Three mistakes pass a green build with no warning, so verify them
explicitly:

- **Unlayered tokens import (Pitfall #7).** Never `@import
  "remarque-tokens" layer(...)` — layering makes every `@theme inline`
  mapped utility circular and invalid.
- **String-form `@import` only (Pitfall #6).** `@import './tokens.css';`,
  never `@import url(...)` — Tailwind v4/Lightning CSS silently drops the
  latter for local files. Verify the built CSS contains `.remarque-prose`
  after touching any import.
- **`.remarque-prose` + `.content-reading` pairing.** `.remarque-prose`
  supplies typography only; it does not center the column. Every reading
  column needs both classes together, and (Pitfall #2) the page's header
  must share the same centered measure the prose body uses, or the two
  misalign.

- Gate: grep the built CSS for `.remarque-prose` (proves the import
  survived), and confirm every prose block in the new page carries
  `content-reading` alongside it.

## 5. Acceptance

```bash
npx remarque-audit --palette <file> --src <dir> --json
```

Requires `passed: true` in the JSON — not "looks close." If the page used
a registry module, also re-check it against that module's own
markup-contract rule from AGENT_RULES.md's Quality Checklist: Essay's
sidenote/TOC-rail DOM-order + `aria-label` rule, Broadsheet's
`data-entry-number`/`attr()` + small-caps rule, Forms' label/
`aria-describedby` pairing rule, or Palette Deck's `data-palette`/
`data-theme` co-location rule.

- Gate: `remarque-audit --json` reports `passed: true`, AND the
  module-specific markup-contract rule above holds. Either failing means
  the page isn't done.
