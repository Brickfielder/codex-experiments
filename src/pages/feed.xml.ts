import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import papers from '../../data/papers.normalized.json';
import type { Paper } from '~/utils/types';

export const GET: APIRoute = () => {
  const typed = papers as Paper[];
  return rss({
    title: 'OHCA Survivorship Repository',
    description: 'Latest additions to the OHCA Survivorship Repository',
    site: import.meta.env.SITE ?? 'https://example.com',
    items: typed.slice(0, 20).map((paper) => ({
      link: `/paper/${paper.id}`,
      title: paper.title,
      description: paper.abstract,
      pubDate: paper.date ? new Date(paper.date) : new Date(paper.year, 0, 1)
    }))
  });
};
