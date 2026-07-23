/*
 * Remarque design tokens — GENERATED from tokens.json by
 * scripts/tokens-json.mjs (v0.20.0). Do not edit — the CSS
 * (tokens-core.css + tokens-palette.css) is the source of truth;
 * tokens.json is the intermediate machine-readable form this file is
 * generated from. Regenerate with: node scripts/tokens-json.mjs
 *
 * This package has no JS entry point — these types exist for editors
 * and TypeScript consumers that either author Remarque token names
 * (RemarqueToken, RemarqueCssVar) or read tokens.json programmatically
 * (RemarqueTokensFile / RemarqueTokenValues, and the ambient module
 * declaration below for `import tokens from 'remarque-tokens/tokens.json'`).
 */

/** All core-tier token names (tokens-core.css). Never overridden. */
export type RemarqueCoreToken =
  | 'text-display'
  | 'text-title'
  | 'text-section'
  | 'text-body-lg'
  | 'text-body'
  | 'text-meta'
  | 'text-micro'
  | 'leading-display'
  | 'leading-title'
  | 'leading-section'
  | 'leading-body'
  | 'leading-meta'
  | 'tracking-display'
  | 'tracking-title'
  | 'tracking-body'
  | 'tracking-meta'
  | 'tracking-caps'
  | 'weight-regular'
  | 'weight-medium'
  | 'weight-semibold'
  | 'space-1'
  | 'space-2'
  | 'space-3'
  | 'space-4'
  | 'space-5'
  | 'space-6'
  | 'space-7'
  | 'space-8'
  | 'space-9'
  | 'space-10'
  | 'space-11'
  | 'space-12'
  | 'content-standard'
  | 'content-wide'
  | 'radius-sm'
  | 'radius-md'
  | 'radius-none'
  | 'border-width'
  | 'border-style'
  | 'motion-fast'
  | 'motion-normal'
  | 'motion-easing'
  | 'z-base'
  | 'z-sticky'
  | 'z-dropdown'
  | 'z-overlay'
  | 'z-modal'
  | 'z-toast'
  | 'z-skip-link';

/** All palette-tier token names (tokens-palette.css). The sanctioned personalization surface. */
export type RemarquePaletteToken =
  | 'font-display'
  | 'font-body'
  | 'font-mono'
  | 'content-reading'
  | 'weight-display'
  | 'color-bg'
  | 'color-bg-subtle'
  | 'color-fg'
  | 'color-fg-muted'
  | 'color-muted'
  | 'color-border'
  | 'color-border-bold'
  | 'color-surface'
  | 'color-accent'
  | 'color-accent-hover'
  | 'color-accent-subtle'
  | 'color-link'
  | 'color-link-hover'
  | 'color-focus-ring'
  | 'color-selection-bg'
  | 'color-selection-fg'
  | 'color-code-bg'
  | 'color-code-fg'
  | 'color-syntax-keyword'
  | 'color-syntax-string'
  | 'color-syntax-constant'
  | 'color-syntax-comment'
  | 'color-syntax-function'
  | 'color-syntax-type'
  | 'color-syntax-punctuation'
  | 'color-syntax-variable'
  | 'color-syntax-link'
  | 'color-error'
  | 'color-error-subtle'
  | 'color-success'
  | 'color-success-subtle'
  | 'color-warning'
  | 'color-warning-subtle'
  | 'color-disabled';

/** Every Remarque token name, core + palette. */
export type RemarqueToken = RemarqueCoreToken | RemarquePaletteToken;

/** A Remarque token name as its CSS custom-property form, e.g. `--text-body`. */
export type RemarqueCssVar = `--${RemarqueToken}`;

/** W3C design-tokens `$type` values used across tokens.json. */
export type RemarqueTokenType =
  | 'color'
  | 'dimension'
  | 'number'
  | 'fontFamily'
  | 'fontWeight'
  | 'duration'
  | 'string';

/** Shape of a single core-tier entry in tokens.json's `core` map. */
export interface RemarqueCoreTokenEntry {
  readonly $value: string | number;
  readonly $type: RemarqueTokenType;
}

/** Shape of one theme side (`light`/`dark`) of a palette-tier entry. */
export interface RemarquePaletteTokenSideValue {
  readonly $value: string | number;
  readonly $extensions?: {
    readonly remarque?: {
      readonly inheritedFromLight?: boolean;
    };
  };
}

/** Shape of a single palette-tier entry in tokens.json's `palette` map. */
export interface RemarquePaletteTokenEntry {
  readonly $type: RemarqueTokenType;
  readonly light: RemarquePaletteTokenSideValue;
  readonly dark: RemarquePaletteTokenSideValue;
}

/**
 * Typed shape of tokens.json's default export — the whole generated
 * file, structurally. Use this when reading tokens.json dynamically
 * (`JSON.parse`, a bundler JSON import without the ambient module
 * below applying, etc).
 */
export interface RemarqueTokensFile {
  readonly $schema: string;
  readonly $description: string;
  readonly $extensions: {
    readonly remarque: {
      readonly version: string;
      readonly tiers: {
        readonly core: string;
        readonly palette: string;
      };
      /** DTCG conformance note (issue #99) — see REMARQUE.md "DTCG Conformance". */
      readonly dtcg: {
        readonly conformance: string;
        readonly divergences: ReadonlyArray<{
          readonly aspect: string;
          readonly detail: string;
          readonly gatedOn: string;
        }>;
        readonly note: string;
      };
    };
  };
  readonly core: { readonly [K in RemarqueCoreToken]: RemarqueCoreTokenEntry };
  readonly palette: { readonly [K in RemarquePaletteToken]: RemarquePaletteTokenEntry };
}

/**
 * The actual current value of every token, as literal types — precise
 * autocomplete for "what is `--text-body` right now", not just "what
 * are its shape and type". Regenerated alongside tokens.json, so these
 * literals track the live CSS across releases.
 */
export interface RemarqueTokenValues {
  readonly core: {
    readonly 'text-display': "clamp(2.75rem, 5.5vw, 5rem)";
    readonly 'text-title': "clamp(1.875rem, 3.5vw, 3rem)";
    readonly 'text-section': "clamp(1.375rem, 2.25vw, 2rem)";
    readonly 'text-body-lg': "1.1875rem";
    readonly 'text-body': "1.0625rem";
    readonly 'text-meta': "0.875rem";
    readonly 'text-micro': "0.8125rem";
    readonly 'leading-display': 1.05;
    readonly 'leading-title': 1.15;
    readonly 'leading-section': 1.2;
    readonly 'leading-body': 1.75;
    readonly 'leading-meta': 1.5;
    readonly 'tracking-display': "-0.02em";
    readonly 'tracking-title': "-0.015em";
    readonly 'tracking-body': "0em";
    readonly 'tracking-meta': "0.02em";
    readonly 'tracking-caps': "0.06em";
    readonly 'weight-regular': 400;
    readonly 'weight-medium': 500;
    readonly 'weight-semibold': 600;
    readonly 'space-1': "0.25rem";
    readonly 'space-2': "0.5rem";
    readonly 'space-3': "0.75rem";
    readonly 'space-4': "1rem";
    readonly 'space-5': "1.5rem";
    readonly 'space-6': "2rem";
    readonly 'space-7': "3rem";
    readonly 'space-8': "4rem";
    readonly 'space-9': "6rem";
    readonly 'space-10': "8rem";
    readonly 'space-11': "10rem";
    readonly 'space-12': "12rem";
    readonly 'content-standard': "72rem";
    readonly 'content-wide': "88rem";
    readonly 'radius-sm': "0.25rem";
    readonly 'radius-md': "0.5rem";
    readonly 'radius-none': "0";
    readonly 'border-width': "1px";
    readonly 'border-style': "solid";
    readonly 'motion-fast': "120ms";
    readonly 'motion-normal': "180ms";
    readonly 'motion-easing': "ease-out";
    readonly 'z-base': 0;
    readonly 'z-sticky': 10;
    readonly 'z-dropdown': 20;
    readonly 'z-overlay': 30;
    readonly 'z-modal': 40;
    readonly 'z-toast': 50;
    readonly 'z-skip-link': 60;
  };
  readonly palette: {
    readonly 'font-display': {
      readonly light: "\"Newsreader\", Georgia, \"Times New Roman\", serif";
      readonly dark: "\"Newsreader\", Georgia, \"Times New Roman\", serif";
    };
    readonly 'font-body': {
      readonly light: "\"Inter\", ui-sans-serif, system-ui, -apple-system, sans-serif";
      readonly dark: "\"Inter\", ui-sans-serif, system-ui, -apple-system, sans-serif";
    };
    readonly 'font-mono': {
      readonly light: "\"JetBrains Mono\", ui-monospace, \"Cascadia Code\", \"Fira Code\", monospace";
      readonly dark: "\"JetBrains Mono\", ui-monospace, \"Cascadia Code\", \"Fira Code\", monospace";
    };
    readonly 'content-reading': {
      readonly light: "46rem";
      readonly dark: "46rem";
    };
    readonly 'weight-display': {
      readonly light: 400;
      readonly dark: 500;
    };
    readonly 'color-bg': {
      readonly light: "oklch(0.975 0.005 80)";
      readonly dark: "oklch(0.16 0.01 80)";
    };
    readonly 'color-bg-subtle': {
      readonly light: "oklch(0.955 0.005 80)";
      readonly dark: "oklch(0.19 0.01 80)";
    };
    readonly 'color-fg': {
      readonly light: "oklch(0.18 0.01 80)";
      readonly dark: "oklch(0.90 0.005 80)";
    };
    readonly 'color-fg-muted': {
      readonly light: "oklch(0.43 0.015 80)";
      readonly dark: "oklch(0.70 0.01 80)";
    };
    readonly 'color-muted': {
      readonly light: "oklch(0.54 0.01 80)";
      readonly dark: "oklch(0.60 0.01 80)";
    };
    readonly 'color-border': {
      readonly light: "oklch(0.88 0.005 80)";
      readonly dark: "oklch(0.25 0.005 80)";
    };
    readonly 'color-border-bold': {
      readonly light: "oklch(0.62 0.01 80)";
      readonly dark: "oklch(0.50 0.01 80)";
    };
    readonly 'color-surface': {
      readonly light: "oklch(0.965 0.005 80)";
      readonly dark: "oklch(0.19 0.01 80)";
    };
    readonly 'color-accent': {
      readonly light: "oklch(0.50 0.14 250)";
      readonly dark: "oklch(0.68 0.12 250)";
    };
    readonly 'color-accent-hover': {
      readonly light: "oklch(0.42 0.11 250)";
      readonly dark: "oklch(0.75 0.12 250)";
    };
    readonly 'color-accent-subtle': {
      readonly light: "oklch(0.95 0.02 250)";
      readonly dark: "oklch(0.22 0.04 250)";
    };
    readonly 'color-link': {
      readonly light: "var(--color-accent)";
      readonly dark: "var(--color-accent)";
    };
    readonly 'color-link-hover': {
      readonly light: "var(--color-accent-hover)";
      readonly dark: "var(--color-accent-hover)";
    };
    readonly 'color-focus-ring': {
      readonly light: "var(--color-accent)";
      readonly dark: "var(--color-accent)";
    };
    readonly 'color-selection-bg': {
      readonly light: "oklch(0.92 0.04 250)";
      readonly dark: "oklch(0.30 0.06 250)";
    };
    readonly 'color-selection-fg': {
      readonly light: "var(--color-fg)";
      readonly dark: "oklch(0.92 0.005 80)";
    };
    readonly 'color-code-bg': {
      readonly light: "oklch(0.945 0.005 80)";
      readonly dark: "oklch(0.20 0.005 80)";
    };
    readonly 'color-code-fg': {
      readonly light: "var(--color-fg)";
      readonly dark: "oklch(0.88 0.005 80)";
    };
    readonly 'color-syntax-keyword': {
      readonly light: "oklch(0.51 0.12 250)";
      readonly dark: "oklch(0.61 0.11 250)";
    };
    readonly 'color-syntax-string': {
      readonly light: "oklch(0.50 0.12 145)";
      readonly dark: "oklch(0.60 0.11 145)";
    };
    readonly 'color-syntax-constant': {
      readonly light: "oklch(0.51 0.105 85)";
      readonly dark: "oklch(0.61 0.11 84)";
    };
    readonly 'color-syntax-comment': {
      readonly light: "oklch(0.52 0.01 80)";
      readonly dark: "oklch(0.60 0.005 80)";
    };
    readonly 'color-syntax-function': {
      readonly light: "oklch(0.52 0.12 310)";
      readonly dark: "oklch(0.62 0.11 310)";
    };
    readonly 'color-syntax-type': {
      readonly light: "oklch(0.50 0.085 196)";
      readonly dark: "oklch(0.60 0.10 195)";
    };
    readonly 'color-syntax-punctuation': {
      readonly light: "oklch(0.52 0.01 80)";
      readonly dark: "oklch(0.60 0.005 80)";
    };
    readonly 'color-syntax-variable': {
      readonly light: "oklch(0.26 0.01 80)";
      readonly dark: "oklch(0.82 0.005 80)";
    };
    readonly 'color-syntax-link': {
      readonly light: "var(--color-accent)";
      readonly dark: "var(--color-accent)";
    };
    readonly 'color-error': {
      readonly light: "oklch(0.52 0.12  25)";
      readonly dark: "oklch(0.62 0.11 26)";
    };
    readonly 'color-error-subtle': {
      readonly light: "oklch(0.95 0.02  25)";
      readonly dark: "oklch(0.22 0.04 25)";
    };
    readonly 'color-success': {
      readonly light: "oklch(0.51 0.12  145)";
      readonly dark: "oklch(0.61 0.11 145)";
    };
    readonly 'color-success-subtle': {
      readonly light: "oklch(0.95 0.02  145)";
      readonly dark: "oklch(0.22 0.04 145)";
    };
    readonly 'color-warning': {
      readonly light: "oklch(0.52 0.105 85)";
      readonly dark: "oklch(0.62 0.11 85)";
    };
    readonly 'color-warning-subtle': {
      readonly light: "oklch(0.95 0.02  85)";
      readonly dark: "oklch(0.22 0.04 85)";
    };
    readonly 'color-disabled': {
      readonly light: "var(--color-muted)";
      readonly dark: "var(--color-muted)";
    };
  };
}

// Precise types for `import tokens from 'remarque-tokens/tokens.json'`
// (and any other bundler-JSON-import path resolving through this
// subpath) without depending on the consumer's `resolveJsonModule`.
declare module 'remarque-tokens/tokens.json' {
  const tokens: RemarqueTokensFile;
  export default tokens;
}
