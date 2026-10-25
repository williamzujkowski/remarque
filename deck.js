/*
 * Remarque — Palette Deck (runtime switching between remarque-theme
 * generated palettes)
 * ───────────────────────────────────────────────────────────────────
 * PROVENANCE — re-scoped, not graduated as-is. The flagship site's
 * theme-deck (12 terminal palettes, `[data-theme-deck]`) was proposed for
 * upstreaming whole in issue #56; a 2026-07-23 consensus panel (3-0)
 * re-scoped it: generation, contrast solving, and pairing all now come
 * from `remarque-theme` (`scripts/theme.mjs`, "Color Providers"), so this
 * module is deliberately THIN — it does none of that. All it does:
 *
 *   1. register the set of valid palette names,
 *   2. switch the active one (`data-palette` on the root element),
 *   3. persist the choice (localStorage), and
 *   4. hand back enough to build a FOUC-safe restore (see REMARQUE.md
 *      "Palette Deck" for the inline <head> snippet — that snippet does
 *      NOT import this module; it duplicates the ~3 lines of restore
 *      logic directly, the same way the light/dark theme toggle's own
 *      head script duplicates rather than imports, because a FOUC guard
 *      must be a synchronous classic script and this file is an ESM
 *      module).
 *
 * No framework, no build step, no CSS authored here — `--scope`'d palette
 * files (npx remarque-theme <slug> --scope <name>) are the caller's job.
 */

const ATTR = 'data-palette';
const DEFAULT_STORAGE_KEY = 'remarque-palette';

/**
 * @param {(string | { name: string })[]} palettes registered palette names
 *   (or `{ name }` objects, for callers that also carry a label/slug pair)
 * @param {{ root?: HTMLElement, storageKey?: string }} [opts]
 */
export function createDeck(palettes, opts = {}) {
  const root = opts.root || document.documentElement;
  const storageKey = opts.storageKey || DEFAULT_STORAGE_KEY;
  const names = palettes.map((p) => (typeof p === 'string' ? p : p.name));

  function isValid(name) {
    return name == null || names.includes(name);
  }

  function current() {
    return root.getAttribute(ATTR);
  }

  /** Switch palettes. `name === null` reverts to the unscoped default. */
  function apply(name, { persist = true } = {}) {
    if (!isValid(name)) throw new Error(`remarque palette-deck: unknown palette "${name}" (registered: ${names.join(', ') || '(none)'})`);
    if (name) root.setAttribute(ATTR, name);
    else root.removeAttribute(ATTR);
    if (persist) {
      try {
        if (name) localStorage.setItem(storageKey, name);
        else localStorage.removeItem(storageKey);
      } catch { /* storage unavailable (private mode) — in-memory only for this load */ }
    }
  }

  /** Re-apply a previously persisted choice (no-op if none / unknown). */
  function restore() {
    let stored = null;
    try { stored = localStorage.getItem(storageKey); } catch { /* ignore */ }
    if (stored && isValid(stored)) apply(stored, { persist: false });
    return current();
  }

  return { names, current, apply, restore };
}

/**
 * Wire a picker of native radio inputs (REMARQUE.md "Palette Deck",
 * registry item "deck-picker") to a deck: checking a radio applies its
 * value (value="" is the site's own palette), and the radio matching the
 * active palette is checked on load. Optional `onChange(name)` runs after
 * each change, e.g. to update a "current theme" label.
 *
 * @param {ReturnType<typeof createDeck>} deck
 * @param {ParentNode} container element holding the radios
 * @param {{ onChange?: (name: string | null) => void, dismissible?: boolean }} [opts]
 */
export function bindPicker(deck, container, opts = {}) {
  const radios = [...container.querySelectorAll('input[type="radio"]')];
  // Opt-in popover manners for a <details> picker (the --popover variant):
  // Escape closes it and returns focus to the summary; so does a click
  // outside it.
  if (opts.dismissible && container instanceof HTMLDetailsElement) {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && container.open) {
        container.open = false;
        container.querySelector('summary')?.focus();
      }
    });
    document.addEventListener('click', (e) => {
      if (container.open && !container.contains(e.target)) container.open = false;
    });
  }
  const sync = () => {
    const active = deck.current() || '';
    for (const r of radios) r.checked = r.value === active;
    opts.onChange?.(active || null);
  };
  for (const r of radios) {
    r.addEventListener('change', () => {
      if (!r.checked) return;
      deck.apply(r.value || null);
      sync();
    });
  }
  sync();
  return { sync };
}

