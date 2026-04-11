import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

export function GET(context: APIContext) {
  return rss({
    title: 'Remarque — Writing',
    description: 'Essays on design, typography, and building for the web.',
    site: context.site?.toString() ?? 'https://williamzujkowski.github.io/remarque/',
    items: [
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
