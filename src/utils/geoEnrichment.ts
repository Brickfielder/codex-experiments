import type { RawPaper } from './types';

const COUNTRY_ALIASES: { code: string; name: string; aliases: string[] }[] = [
  // Existing
  {
    code: 'US',
    name: 'United States',
    aliases: ['United States', 'USA', 'U.S.A.', 'United States of America']
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    aliases: ['United Kingdom', 'UK', 'U.K.', 'England', 'Scotland', 'Wales', 'Northern Ireland']
  },
  { code: 'CA', name: 'Canada', aliases: ['Canada'] },
  { code: 'AU', name: 'Australia', aliases: ['Australia'] },
  { code: 'DE', name: 'Germany', aliases: ['Germany', 'Bundesrepublik Deutschland'] },
  { code: 'FR', name: 'France', aliases: ['France'] },
  { code: 'IT', name: 'Italy', aliases: ['Italy', 'Italia'] },
  { code: 'SE', name: 'Sweden', aliases: ['Sweden', 'Sverige'] },
  { code: 'NO', name: 'Norway', aliases: ['Norway', 'Norge'] },
  { code: 'NL', name: 'the Netherlands', aliases: ['Netherlands', 'the Netherlands', 'The Netherlands', 'Nederland'] },
  { code: 'DK', name: 'Denmark', aliases: ['Denmark', 'Danmark'] },

  // More European countries likely to appear
  { code: 'ES', name: 'Spain', aliases: ['Spain', 'España'] },
  { code: 'PT', name: 'Portugal', aliases: ['Portugal'] },
  { code: 'CH', name: 'Switzerland', aliases: ['Switzerland', 'Suisse', 'Schweiz', 'Svizzera'] },
  { code: 'AT', name: 'Austria', aliases: ['Austria', 'Österreich'] },
  { code: 'BE', name: 'Belgium', aliases: ['Belgium', 'Belgique', 'België'] },
  { code: 'FI', name: 'Finland', aliases: ['Finland', 'Suomi'] },
  { code: 'IE', name: 'Ireland', aliases: ['Ireland', 'Republic of Ireland'] },
  { code: 'PL', name: 'Poland', aliases: ['Poland', 'Polska'] },
  { code: 'CZ', name: 'Czech Republic', aliases: ['Czech Republic', 'Czechia', 'Česko'] },

  // Asia-Pacific, large research contributors
  { code: 'CN', name: 'China', aliases: ['China', "People's Republic of China", 'PR China'] },
  { code: 'JP', name: 'Japan', aliases: ['Japan', 'Nippon'] },
  { code: 'KR', name: 'South Korea', aliases: ['South Korea', 'Republic of Korea', 'Korea'] },
  { code: 'IN', name: 'India', aliases: ['India', 'Bharat'] },
  { code: 'NZ', name: 'New Zealand', aliases: ['New Zealand', 'Aotearoa'] },

  // Americas (beyond US/Canada)
  { code: 'BR', name: 'Brazil', aliases: ['Brazil', 'Brasil'] },
  { code: 'MX', name: 'Mexico', aliases: ['Mexico', 'México'] },
  { code: 'AR', name: 'Argentina', aliases: ['Argentina'] },

  // Middle East / others likely to appear
  { code: 'IL', name: 'Israel', aliases: ['Israel'] },
  { code: 'TR', name: 'Turkey', aliases: ['Turkey', 'Türkiye'] }
];

function inferCountryFromAffiliationText(affiliation: string | undefined | null) {
  if (!affiliation) return null;

  // 1) Try from the end of the affiliation, splitting on commas/semicolons.
  const chunks = affiliation
    .split(/[;,]/)
    .map((c) => c.trim())
    .filter(Boolean);

  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunkLower = chunks[i].toLowerCase();
    for (const c of COUNTRY_ALIASES) {
      for (const alias of c.aliases) {
        if (chunkLower.includes(alias.toLowerCase())) {
          return { code: c.code, name: c.name };
        }
      }
    }
  }

  // 2) Fallback: full-text scan if that somehow failed.
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
      'User-Agent': 'ohca-survivorship-repo/1.0 (mailto:your-email@example.com)'
    }
  });
  if (!res.ok) {
    console.warn(`Crossref lookup failed for DOI ${doi}: ${res.status} ${res.statusText}`);
    return null;
  }
  const json = await res.json();
  return json.message as CrossrefWork;
}

// New: always pick the *last* author.
function pickLastAuthor(authors: CrossrefAuthor[] | undefined): CrossrefAuthor | null {
  if (!authors || authors.length === 0) return null;
  return authors[authors.length - 1];
}

export async function enrichCountryForPaper(record: RawPaper): Promise<RawPaper> {
  // Skip if already enriched or we don't have a DOI
  if (record.corrCountryCode || !record.doi) return record;

  try {
    const work = await fetchCrossrefWork(record.doi);
    if (!work || !work.author || work.author.length === 0) {
      return record;
    }

    const lastAuthor = pickLastAuthor(work.author);
    if (!lastAuthor || !lastAuthor.affiliation || lastAuthor.affiliation.length === 0) {
      return record;
    }

    const affText = lastAuthor.affiliation.map((a) => a.name).join('; ');
    const inferred = inferCountryFromAffiliationText(affText);
    if (!inferred) return record;

    return {
      ...record,
      corrCountryCode: inferred.code,
      corrCountryName: inferred.name
    };
  } catch (err) {
    console.warn(`Failed to enrich country for ${record.doi}:`, err);
    return record;
  }
}
