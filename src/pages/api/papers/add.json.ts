import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { APIRoute } from 'astro';
import { fetchPaperByIdentifier, PaperLookupError } from '~/utils/paperFetcher';
import { normalizeRecords } from '~/utils/normalizer';
import type { RawPaper } from '~/utils/types';

const rawDatasetPath = fileURLToPath(new URL('../../../../data/papers.json', import.meta.url));
const normalizedDatasetPath = fileURLToPath(
  new URL('../../../../data/papers.normalized.json', import.meta.url)
);

interface RequestPayload {
  doi?: string;
  pmid?: string;
  dryRun?: boolean;
}

const sortRecords = (records: RawPaper[]) =>
  [...records].sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));

const findDuplicateId = (records: RawPaper[], candidate: RawPaper): string | undefined => {
  const candidateDoi = candidate.doi?.toLowerCase();
  const candidatePmid = candidate.pmid?.toLowerCase();

  for (const record of records) {
    if (record.id === candidate.id) return record.id;
    if (candidatePmid && record.pmid?.toLowerCase() === candidatePmid) return record.id;
    if (candidateDoi && record.doi?.toLowerCase() === candidateDoi) return record.id;
  }
  return undefined;
};

const loadRecords = async (): Promise<RawPaper[]> => {
  const content = await readFile(rawDatasetPath, 'utf-8');
  return JSON.parse(content) as RawPaper[];
};

export const POST: APIRoute = async ({ request }) => {
  let payload: RequestPayload;

  try {
    payload = (await request.json()) as RequestPayload;
  } catch (error) {
    return new Response(JSON.stringify({ status: 'error', message: 'Invalid JSON payload.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const doi = payload.doi?.trim();
  const pmid = payload.pmid?.trim();
  const dryRun = Boolean(payload.dryRun);

  if (!doi && !pmid) {
    return new Response(
      JSON.stringify({ status: 'error', message: 'Provide a DOI or PubMed ID to add a paper.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const record = await fetchPaperByIdentifier({ doi, pmid });
    const existing = await loadRecords();
    const duplicateId = findDuplicateId(existing, record);

    if (duplicateId) {
      return new Response(
        JSON.stringify({
          status: 'duplicate',
          message: 'This paper already exists in the dataset.',
          existingId: duplicateId
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({
          status: 'ok',
          persisted: false,
          total: existing.length,
          record
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const updated = sortRecords([...existing, record]);
    await writeFile(rawDatasetPath, JSON.stringify(updated, null, 2));
    const normalized = normalizeRecords(updated);
    await writeFile(normalizedDatasetPath, JSON.stringify(normalized, null, 2));

    return new Response(
      JSON.stringify({
        status: 'ok',
        persisted: true,
        total: updated.length,
        record
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    if (error instanceof PaperLookupError) {
      return new Response(JSON.stringify({ status: 'error', message: error.message }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.error('Unhandled error when adding paper', error);
    return new Response(JSON.stringify({ status: 'error', message: 'Unexpected server error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = () =>
  new Response(JSON.stringify({
    status: 'error',
    message: 'Use POST with a DOI or PubMed ID to add papers.'
  }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
