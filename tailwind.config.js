/**
 * Remarque — Tailwind CSS Configuration
 * ──────────────────────────────────────
 * This config extends Tailwind with Remarque's design tokens.
 *
 * TAILWIND VERSION STORY (one canonical answer):
 *   - Tailwind v3.x → use this file as your tailwind.config.js.
 *   - Tailwind v4.x → do NOT use this file. Write an @theme block in CSS
 *     using the values from tokens.css (see site/src/styles/globals.css in
 *     this repo for the reference @theme; a shipped theme.css subpath export
 *     is tracked in issue #48).
 *
 * Tokens are defined in tokens.css as CSS custom properties; this config
 * maps them into Tailwind utilities (font-display, text-title, etc.).
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx,astro}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx,astro}",
    "./components/**/*.{js,ts,jsx,tsx,mdx,astro}",
    "./app/**/*.{js,ts,jsx,tsx,mdx,astro}",
  ],

  // Match Remarque's actual theming mechanism ([data-theme] attribute).
  // The bare "class" strategy only matches a literal `dark` class, which
  // Remarque never sets — dark: utilities would silently never activate.
  darkMode: ["selector", '[data-theme="dark"]'],

  theme: {
    extend: {

      /* ─── Font Families ──────────────────────────────── */
      fontFamily: {
        display: ["Newsreader", "Georgia", "Times New Roman", "serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "Cascadia Code", "Fira Code", "monospace"],
      },

      /* ─── Font Sizes ─────────────────────────────────── */
      /* Maps to: text-display, text-title, text-section, etc. */
      fontSize: {
        "display": ["var(--text-display)", { lineHeight: "var(--leading-display)", letterSpacing: "var(--tracking-display)" }],
        "title": ["var(--text-title)", { lineHeight: "var(--leading-title)", letterSpacing: "var(--tracking-title)" }],
        "section": ["var(--text-section)", { lineHeight: "var(--leading-section)", letterSpacing: "var(--tracking-title)" }],
        "body-lg": ["var(--text-body-lg)", { lineHeight: "var(--leading-body)" }],
        "body": ["var(--text-body)", { lineHeight: "var(--leading-body)" }],
        "meta": ["var(--text-meta)", { lineHeight: "var(--leading-meta)", letterSpacing: "var(--tracking-meta)" }],
        "micro": ["var(--text-micro)", { lineHeight: "var(--leading-meta)" }],
      },

      /* ─── Spacing ────────────────────────────────────── */
      /*
       * Namespaced under remarque-* so Tailwind's default numeric scale is
       * NEVER overridden (mt-12 stays 3rem). Use mt-remarque-9 (6rem) etc.
       * for Remarque's generous editorial spacings, or var(--space-N)
       * directly in arbitrary values: mt-[var(--space-9)].
       */
      spacing: {
        "remarque-1": "var(--space-1)",
        "remarque-2": "var(--space-2)",
        "remarque-3": "var(--space-3)",
        "remarque-4": "var(--space-4)",
        "remarque-5": "var(--space-5)",
        "remarque-6": "var(--space-6)",
        "remarque-7": "var(--space-7)",
        "remarque-8": "var(--space-8)",
        "remarque-9": "var(--space-9)",
        "remarque-10": "var(--space-10)",
        "remarque-11": "var(--space-11)",
        "remarque-12": "var(--space-12)",
      },

      /* ─── Max Widths ─────────────────────────────────── */
      /*
       * Width-constraint utilities ONLY — they do not center.
       * Per AGENT_RULES.md, page sections must use the .content-reading /
       * .content-standard classes from tokens.css (which add
       * margin-inline: auto). Reach for max-w-reading only on elements
       * that are intentionally left-aligned inside an already-constrained
       * container (e.g. a lead paragraph).
       */
      maxWidth: {
        "reading": "var(--content-reading)",      // 46rem — prose
        "standard": "var(--content-standard)",    // 72rem — project pages
        "wide": "var(--content-wide)",            // 88rem — outer container
      },

      /* ─── Colors ─────────────────────────────────────── */
      /* Maps CSS custom properties so Tailwind utilities track theme changes */
      colors: {
        bg: {
          DEFAULT: "var(--color-bg)",
          subtle: "var(--color-bg-subtle)",
        },
        fg: {
          DEFAULT: "var(--color-fg)",
          muted: "var(--color-fg-muted)",
        },
        muted: "var(--color-muted)",
        border: {
          DEFAULT: "var(--color-border)",
          bold: "var(--color-border-bold)",
        },
        surface: "var(--color-surface)",
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          subtle: "var(--color-accent-subtle)",
        },
        code: {
          bg: "var(--color-code-bg)",
          fg: "var(--color-code-fg)",
        },
      },

      /* ─── Border Radius ──────────────────────────────── */
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        none: "0",
      },

      /* ─── Border Color ───────────────────────────────── */
      borderColor: {
        DEFAULT: "var(--color-border)",
        bold: "var(--color-border-bold)",
      },

      /* ─── Transitions ────────────────────────────────── */
      transitionDuration: {
        fast: "var(--motion-fast)",
        normal: "var(--motion-normal)",
      },

      transitionTimingFunction: {
        remarque: "var(--motion-easing)",
      },
    },
  },

  plugins: [],
};
