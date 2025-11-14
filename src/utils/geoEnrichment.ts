import type { RawPaper } from './types';

const COUNTRY_ALIASES: { code: string; name: string; aliases: string[] }[] = [
  {
    code: 'US',
    name: 'United States',
    aliases: ['United States', 'USA', 'U.S.A.', 'United States of America'],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    aliases: ['United Kingdom', 'UK', 'U.K.', 'England', 'Scotland', 'Wales', 'Northern Ireland'],
  },
  { code: 'CA', name: 'Canada', aliases: ['Canada'] },
  { code: 'AU', name: 'Australia', aliases: ['Australia'] },
  { code: 'DE', name: 'Germany', aliases: ['Germany', 'Bundesrepublik Deutschland'] },
  { code: 'FR', name: 'France', aliases: ['France'] },
  { code: 'IT', name: 'Italy', aliases: ['Italy', 'Italia'] },
  { code: 'SE', name: 'Sweden', aliases: ['Sweden', 'Sverige'] },
  { code: 'NO', name: 'Norway', aliases: ['Norway', 'Norge'] },
  { code: 'NL', name: 'Netherlands', aliases: ['Netherlands', 'The Netherlands', 'Nederland'] },
];

function inferCountryFromAffiliationText(affiliation: string | undefined | null) {
  if (!affiliation) return null;
  const lower = affiliation.toLowerCase();

  for (const c of COUNTRY_ALIASES) {
    for (const alias of c.aliases) {
      if (lower.includes(alias.toLowerCase())) {
        return { code: c.code, name: c.name };
      }
    }
  }
  return null;
}

type CrossrefAuthor = {
  given?: string;
  family?: string;
  sequence?: string;
  affiliation?: { name: string }[];
  [key: string]: unknown;
};

type CrossrefWork = {
  author?: CrossrefAuthor[];
};

async function fetchCrossrefWork(doi: string): Promise<CrossrefWork | null> {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'ohca-survivorship-repo/1.0 (mailto:your-email@example.com)',
    },
  });
  if (!res.ok) {
    console.warn(`Crossref lookup failed for DOI ${doi}: ${res.status} ${res.statusText}`);
    return null;
  }
  const json = await res.json();
  return json.message as CrossrefWork;
}

function pickCorrespondingLikeAuthor(authors: CrossrefAuthor[] | undefined): CrossrefAuthor | null {
  if (!authors || authors.length === 0) return null;

  const withRole = authors.find((a: any) => {
    const role = (a['author-role'] || a.role) as string | undefined;
    return role && role.toLowerCase().includes('corresponding');
  });
  if (withRole) return withRole;

  if (authors.length > 1) {
    return authors[authors.length - 1];
  }

  return authors[0];
}

export async function enrichCountryForPaper(record: RawPaper): Promise<RawPaper> {
  if (record.corrCountryCode || !record.doi) return record;

  try {
    const work = await fetchCrossrefWork(record.doi);
    if (!work || !work.author || work.author.length === 0) {
      return record;
    }

    const corr = pickCorrespondingLikeAuthor(work.author);
    if (!corr || !corr.affiliation || corr.affiliation.length === 0) {
      return record;
    }

    const affText = corr.affiliation.map(a => a.name).join('; ');
    const inferred = inferCountryFromAffiliationText(affText);
    if (!inferred) return record;

    return {
      ...record,
      corrCountryCode: inferred.code,
      corrCountryName: inferred.name,
    };
  } catch (err) {
    console.warn(`Failed to enrich country for ${record.doi}:`, err);
    return record;
  }
}
