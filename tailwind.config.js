/**
 * Remarque — Tailwind CSS Configuration
 * ──────────────────────────────────────
 * This config extends Tailwind with Remarque's design tokens.
 * It does NOT replace Tailwind's defaults wholesale — it adds
 * the Remarque-specific values agents and developers should reach for first.
 *
 * Tokens are defined in tokens.css as CSS custom properties.
 * This config maps them into Tailwind utilities so you can use
 * classes like `font-display`, `text-title`, `max-w-reading`, etc.
 *
 * Compatible with Tailwind CSS v3.x and v4.x.
 * For Tailwind v4, you may prefer using @theme directives in CSS directly —
 * see tokens.css for the raw values.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx,astro}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx,astro}",
    "./components/**/*.{js,ts,jsx,tsx,mdx,astro}",
    "./app/**/*.{js,ts,jsx,tsx,mdx,astro}",
  ],

  darkMode: "class", // supports both class and media — toggle via [data-theme="dark"] or .dark

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
      /* Extends default scale with Remarque's generous upper values */
      spacing: {
        "px": "1px",
        "0": "0",
        "1": "var(--space-1)",
        "2": "var(--space-2)",
        "3": "var(--space-3)",
        "4": "var(--space-4)",
        "5": "var(--space-5)",
        "6": "var(--space-6)",
        "7": "var(--space-7)",
        "8": "var(--space-8)",
        "9": "var(--space-9)",
        "10": "var(--space-10)",
        "11": "var(--space-11)",
        "12": "var(--space-12)",
      },

      /* ─── Max Widths ─────────────────────────────────── */
      /* The three content widths are the most critical layout tokens. */
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

      /* ─── Typography Plugin Overrides ────────────────── */
      /* If using @tailwindcss/typography, these override its defaults */
      typography: {
        remarque: {
          css: {
            "--tw-prose-body": "var(--color-fg)",
            "--tw-prose-headings": "var(--color-fg)",
            "--tw-prose-links": "var(--color-accent)",
            "--tw-prose-bold": "var(--color-fg)",
            "--tw-prose-code": "var(--color-code-fg)",
            "--tw-prose-pre-bg": "var(--color-code-bg)",
            "--tw-prose-pre-code": "var(--color-code-fg)",
            "--tw-prose-quotes": "var(--color-fg-muted)",
            "--tw-prose-quote-borders": "var(--color-border-bold)",
            "--tw-prose-hr": "var(--color-border)",

            maxWidth: "var(--content-reading)",
            fontSize: "var(--text-body)",
            lineHeight: "var(--leading-body)",

            h2: {
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-section)",
              lineHeight: "var(--leading-section)",
              letterSpacing: "var(--tracking-title)",
              fontWeight: "var(--weight-medium)",
              marginTop: "var(--space-8)",
              marginBottom: "var(--space-4)",
            },
            h3: {
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-body-lg)",
              lineHeight: "var(--leading-title)",
              fontWeight: "var(--weight-semibold)",
              marginTop: "var(--space-7)",
              marginBottom: "var(--space-3)",
            },
            a: {
              color: "var(--color-link)",
              textDecoration: "underline",
              textUnderlineOffset: "0.2em",
              textDecorationThickness: "1px",
              transition: `color var(--motion-fast) var(--motion-easing)`,
              "&:hover": {
                color: "var(--color-link-hover)",
              },
            },
            blockquote: {
              borderLeftColor: "var(--color-border-bold)",
              borderLeftWidth: "2px",
              paddingLeft: "var(--space-5)",
              color: "var(--color-fg-muted)",
              fontStyle: "italic",
            },
            code: {
              fontFamily: "var(--font-mono)",
              fontSize: "0.9em",
              backgroundColor: "var(--color-code-bg)",
              padding: "0.15em 0.35em",
              borderRadius: "var(--radius-sm)",
            },
            pre: {
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-meta)",
              lineHeight: "1.6",
              backgroundColor: "var(--color-code-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-5)",
            },
            hr: {
              borderColor: "var(--color-border)",
              marginTop: "var(--space-8)",
              marginBottom: "var(--space-8)",
            },
            img: {
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
            },
            figcaption: {
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-meta)",
              letterSpacing: "var(--tracking-meta)",
              color: "var(--color-muted)",
            },
          },
        },
      },
    },
  },

  plugins: [
    // Uncomment if using @tailwindcss/typography:
    // require("@tailwindcss/typography"),
  ],
};
