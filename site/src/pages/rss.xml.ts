import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

export function GET(context: APIContext) {
  return rss({
    title: 'Remarque — Writing',
    description: 'Essays on design, typography, and building for the web.',
    // Fallback matches astro.config's `site` WITHOUT `base` — item links below
    // already carry the /remarque/ prefix, so including it here would double it.
    site: context.site?.toString() ?? 'https://williamzujkowski.github.io/',
    items: [
      {
        title: 'Palettes as Data',
        pubDate: new Date('2026-10-28'),
        description: 'How a dataset of terminal themes becomes audited site palettes, why the contrast gate outranks taste, and what a footer picker nobody could find taught us.',
        link: '/remarque/writing/palettes-as-data/',
      },
      {
        title: 'Why 17px and 38rem',
        pubDate: new Date('2026-10-28'),
        description: 'Where the body size, the reading measure and the leading come from: a published floor, a measurement that corrected an earlier mistake, and one deviation argued in the open.',
        link: '/remarque/writing/why-17px-and-38rem/',
      },
      {
        title: 'Typography as Interface',
        pubDate: new Date('2026-04-08'),
        description: 'When typography is the primary visual system, every decision about type is a decision about interface.',
        link: '/remarque/writing/typography-as-interface/',
      },
      {
        title: 'Against Decoration',
        pubDate: new Date('2026-03-29'),
        description: 'The modern web is drowning in visual noise. What if the antidote is restraint?',
        link: '/remarque/writing/against-decoration/',
      },
    ],
  });
}
