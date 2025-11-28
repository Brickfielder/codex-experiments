import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import papers from '../../data/papers.normalized.json';
import { getPaperPermalink, siteBaseUrl } from '~/utils/siteUrls';
import type { Paper } from '~/utils/types';

export const GET: APIRoute = () => {
  const typed = papers as Paper[];
  const site = siteBaseUrl;
  return rss({
    title: 'Cardiac Arrest Research Hub',
    description: 'Latest additions to the Cardiac Arrest Research Hub',
    site,
    items: typed.slice(0, 20).map((paper) => ({
      link: getPaperPermalink(paper.id),
      title: paper.title,
      description: paper.abstract,
      pubDate: paper.date ? new Date(paper.date) : new Date(paper.year, 0, 1)
    }))
  });
};
