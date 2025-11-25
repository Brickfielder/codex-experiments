import ongoingStudies from '../../../data/ongoing-studies.json';

export const prerender = true;

export function GET() {
  return new Response(JSON.stringify(ongoingStudies, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}
