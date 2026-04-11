# Remarque

A typography-first design system for editorial, technical, and personal web projects.

---

## What is this?

Remarque is an opinionated design system built for personal websites, blogs, project pages, and technical writing. It prioritizes reading comfort, typographic hierarchy, and visual consistency over component variety or decorative flourish.

It is designed to be consumed by both human developers and AI agents (Claude Code, Cursor, Copilot, etc.) with minimal drift from the intended aesthetic.

## Files

| File | Purpose |
|------|---------|
| `REMARQUE.md` | Full system specification — philosophy, rules, archetypes, acceptance criteria |
| `AGENT_RULES.md` | Implementation contract for agents — build order, non-negotiables, checklists |
| `tokens.css` | Design tokens as CSS custom properties + base typography classes + prose styling |
| `tailwind.config.js` | Tailwind CSS configuration that maps tokens to utility classes |

## Quick Start

1. Copy `tokens.css` and `tailwind.config.js` into your project
2. Import `tokens.css` before your other styles
3. Update `tailwind.config.js` content paths to match your project structure
4. Use the typography classes (`text-display`, `text-title`, `text-meta`, etc.) and content width utilities (`max-w-reading`, `max-w-standard`)
5. Wrap article content in `.remarque-prose` for automatic prose styling

## For AI Agents

When prompting an agent to build with Remarque:

```
Build this page using the Remarque design system.
See: REMARQUE.md for specification, AGENT_RULES.md for implementation contract, tokens.css for design tokens.
```

Agents should load all three files before beginning work.

## Font Stack

| Role | Font | Usage |
|------|------|-------|
| Display | Newsreader | Page titles, hero headings |
| Body | Inter | Body text, UI, navigation |
| Mono | JetBrains Mono | Metadata, code, labels, timestamps |

## Page Archetypes

Every page must conform to one of four archetypes:

- **Essay** — long-form writing with narrow reading column
- **Project Dossier** — structured project page with metadata and architecture
- **Notebook** — short-form notes, links, observations
- **Landing** — homepage with clear identity statement and navigation

## Named For

In fine art printmaking, a *remarque* is a small original drawing made by the artist in the margin of a proof print. Found only in limited editions, it is the mark that says: this was made by someone specific, with intention.

## License

MIT
