import type { APIRoute } from 'astro';
import papers from '../../data/papers.normalized.json';
import type { Paper } from '~/utils/types';

export const GET: APIRoute = ({ site }) => {
  const typed = papers as Paper[];
  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'OHCA Survivorship Repository',
    home_page_url: site ?? 'https://example.com',
    feed_url: site ? new URL('/feed.json', site).toString() : undefined,
    description: 'Latest additions to the OHCA Survivorship Repository',
    items: typed.slice(0, 20).map((paper) => ({
      id: paper.id,
      url: site ? new URL(`/paper/${paper.id}`, site).toString() : `/paper/${paper.id}`,
      title: paper.title,
      content_text: paper.abstract,
      date_published: paper.date ?? `${paper.year}-01-01`
    }))
  };
  return new Response(JSON.stringify(feed, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/feed+json; charset=utf-8'
    }
  });
};
