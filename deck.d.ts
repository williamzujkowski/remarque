/*
 * Types for remarque-tokens/deck (deck.js): the Palette Deck runtime.
 * Hand-written to match deck.js; scripts/test-types.mjs checks the two
 * export the same names.
 */

/** A palette name, or an object carrying one (e.g. an entry of deck.json's `palettes`). */
export type PaletteEntry = string | { name: string };

export interface DeckOptions {
  /** Element that carries `data-palette`. Default: `document.documentElement`. */
  root?: HTMLElement;
  /** localStorage key for the choice. Default: `"remarque-palette"`. */
  storageKey?: string;
}

export interface Deck {
  /** The registered palette names. */
  readonly names: string[];
  /** The active palette, or null for the site's own. */
  current(): string | null;
  /** Switch palettes; `null` reverts to the site's own. Throws on an unregistered name. */
  apply(name: string | null, opts?: { persist?: boolean }): void;
  /** Re-apply a persisted choice (no-op if none or unknown); returns the active palette. */
  restore(): string | null;
}

export function createDeck(palettes: PaletteEntry[], opts?: DeckOptions): Deck;

export interface BindPickerOptions {
  /** Runs after each change and once on bind, with the active palette (null = the site's own). */
  onChange?: (name: string | null) => void;
  /** For a `<details>` picker (the popover variant): close on Escape and on an outside click. */
  dismissible?: boolean;
}

/** Wire a picker of native radio inputs (registry item "deck-picker") to a deck. */
export function bindPicker(deck: Deck, container: ParentNode, opts?: BindPickerOptions): { sync(): void };
