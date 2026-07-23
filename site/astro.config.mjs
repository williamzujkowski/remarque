// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import { remarqueShikiTheme } from './src/lib/shiki-theme.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://williamzujkowski.github.io',
  base: '/remarque/',
  integrations: [mdx()],
  markdown: {
    // Wires --color-syntax-* (remarque-tokens) into Shiki's
    // css-variables mode — see REMARQUE.md "Syntax Highlighting".
    shikiConfig: {
      theme: remarqueShikiTheme,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
