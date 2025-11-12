import type { APIRoute } from 'astro';
import papers from '../../../data/papers.normalized.json';

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(papers, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
