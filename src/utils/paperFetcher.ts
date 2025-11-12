import { XMLParser } from 'fast-xml-parser';
import type { RawPaper } from './types';

const CROSSREF_ENDPOINT = 'https://api.crossref.org/works/';
const PUBMED_EFETCH_ENDPOINT = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

const CROSSREF_USER_AGENT =
  process.env.CROSSREF_USER_AGENT ??
  'OHCA-Survivorship-Repo/1.0 (+https://github.com/brickfielder/codex-experiments)';
const PUBMED_TOOL_NAME = process.env.PUBMED_TOOL_NAME ?? 'ohca-survivorship-repo';
const PUBMED_TOOL_EMAIL =
  process.env.PUBMED_TOOL_EMAIL ?? 'opensource@ohca-survivorship.example.com';
const NCBI_API_KEY = process.env.NCBI_API_KEY;

type Fetcher = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

const defaultFetch: Fetcher = (input, init) => {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available in this environment.');
  }
  return fetch(input, init);
};

export class PaperLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaperLookupError';
  }
}

export const resolvePmidFromPmcid = async (
  pmcid: string,
  fetcher: Fetcher = defaultFetch
): Promise<string> => {
  const trimmed = pmcid.trim();
  if (!trimmed) {
    throw new PaperLookupError('A PMCID is required.');
  }
  const normalized = trimmed.toUpperCase().startsWith('PMC')
    ? trimmed.toUpperCase()
    : `PMC${trimmed}`;
  const target = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi');
  target.searchParams.set('dbfrom', 'pmc');
  target.searchParams.set('db', 'pubmed');
  target.searchParams.set('retmode', 'json');
  target.searchParams.set('id', normalized);
  target.searchParams.set('tool', PUBMED_TOOL_NAME);
  target.searchParams.set('email', PUBMED_TOOL_EMAIL);
  if (NCBI_API_KEY) {
    target.searchParams.set('api_key', NCBI_API_KEY);
  }
  const response = await fetcher(target.toString(), {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) {
    throw new PaperLookupError(
      `PMCID lookup failed (${response.status} ${response.statusText})`
    );
  }
  const payload = (await response.json()) as {
    linksets?: {
      linksetdbs?: {
        dbto?: string;
        links?: (string | number)[];
      }[];
    }[];
  };
  const linksets = payload.linksets ?? [];
  for (const set of linksets) {
    const databases = set.linksetdbs ?? [];
    for (const db of databases) {
      if (db.dbto && db.dbto.toLowerCase() !== 'pubmed') continue;
      const first = db.links?.[0];
      if (first) {
        const pmid = String(first).trim();
        if (pmid) return pmid;
      }
    }
  }
  throw new PaperLookupError(`Unable to resolve PMCID ${normalized} to a PubMed ID.`);
};

const stripHtml = (value?: string): string => {
  if (!value) return '';
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const toArray = <T>(value: T | T[] | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const monthToNumber = (month?: string): string | undefined => {
  if (!month) return undefined;
  const normalized = month.toLowerCase();
  const mapping: Record<string, string> = {
    jan: '01',
    january: '01',
    feb: '02',
    february: '02',
    mar: '03',
    march: '03',
    apr: '04',
    april: '04',
    may: '05',
    jun: '06',
    june: '06',
    jul: '07',
    july: '07',
    aug: '08',
    august: '08',
    sep: '09',
    sept: '09',
    september: '09',
    oct: '10',
    october: '10',
    nov: '11',
    november: '11',
    dec: '12',
    december: '12'
  };
  return mapping[normalized];
};

const buildDate = (parts?: (string | number | undefined)[]): string | undefined => {
  if (!parts || parts.length === 0) return undefined;
  const [year, month, day] = parts;
  if (!year) return undefined;
  const normalizedMonth = typeof month === 'number' ? String(month).padStart(2, '0') : month;
  const normalizedDay = typeof day === 'number' ? String(day).padStart(2, '0') : day;
  if (normalizedMonth && normalizedDay) return `${year}-${normalizedMonth}-${normalizedDay}`;
  if (normalizedMonth) return `${year}-${normalizedMonth}`;
  return `${year}`;
};

const cleanLinks = (links: RawPaper['links']): RawPaper['links'] => {
  return Object.entries(links).reduce<RawPaper['links']>((acc, [key, value]) => {
    if (value) acc[key as keyof RawPaper['links']] = value;
    return acc;
  }, {});
};

const cleanFlags = (flags?: RawPaper['flags']): RawPaper['flags'] | undefined => {
  if (!flags) return undefined;
  const entries = Object.entries(flags).filter(([, value]) => value !== undefined);
  return entries.length ? Object.fromEntries(entries) : undefined;
};

interface CrossrefAuthor {
  given?: string;
  family?: string;
  name?: string;
}

interface CrossrefMessage {
  DOI?: string;
  title?: string[];
  abstract?: string;
  author?: CrossrefAuthor[];
  subject?: string[];
  issued?: { 'date-parts'?: (number | undefined)[][] };
  'container-title'?: string[];
  publisher?: string;
  license?: unknown[];
  link?: { URL?: string }[];
  ['pub-med-id']?: string | number;
  published?: { 'date-parts'?: (number | undefined)[][] };
  ['published-print']?: { 'date-parts'?: (number | undefined)[][] };
  ['published-online']?: { 'date-parts'?: (number | undefined)[][] };
}

const extractCrossrefAuthors = (authors?: CrossrefAuthor[]): string[] => {
  if (!authors) return [];
  return authors
    .map((author) => {
      if (author.name) return author.name.trim();
      const parts = [author.family, author.given].filter(Boolean);
      return parts.join(', ').trim();
    })
    .filter(Boolean);
};

const extractCrossrefDate = (
  message: CrossrefMessage
): { year: number; date?: string } | undefined => {
  const fallback =
    message['published-print']?.['date-parts']?.[0] ??
    message['published-online']?.['date-parts']?.[0] ??
    message.published?.['date-parts']?.[0] ??
    message.issued?.['date-parts']?.[0];
  if (!fallback || fallback.length === 0) return undefined;
  const [year, month, day] = fallback;
  if (!year) return undefined;
  const monthStr = typeof month === 'number' ? String(month).padStart(2, '0') : month;
  const dayStr = typeof day === 'number' ? String(day).padStart(2, '0') : day;
  const date = buildDate([year, monthStr, dayStr]);
  return { year, date };
};

export const fetchCrossrefMetadata = async (
  doi: string,
  fetcher: Fetcher = defaultFetch
): Promise<RawPaper> => {
  const trimmed = doi.trim().toLowerCase();
  const target = `${CROSSREF_ENDPOINT}${encodeURIComponent(trimmed)}`;
  const response = await fetcher(target, {
    headers: {
      Accept: 'application/json',
      'User-Agent': CROSSREF_USER_AGENT
    }
  });
  if (!response.ok) {
    throw new PaperLookupError(
      `Crossref lookup failed (${response.status} ${response.statusText})`
    );
  }
  const payload = (await response.json()) as { message?: CrossrefMessage };
  const message = payload.message;
  if (!message) {
    throw new PaperLookupError('Crossref response did not include work metadata.');
  }
  const title = message.title?.[0]?.trim();
  if (!title) {
    throw new PaperLookupError('Crossref response is missing a title.');
  }
  const dateInfo = extractCrossrefDate(message);
  if (!dateInfo?.year) {
    throw new PaperLookupError('Crossref response is missing a publication year.');
  }
  const doiValue = message.DOI ?? trimmed;
  const pmid = message['pub-med-id'] ? String(message['pub-med-id']) : undefined;
  const abstract = stripHtml(message.abstract);
  const keywordSeed = message.subject
    ?.map((subject) => subject.trim())
    .filter((subject): subject is string => Boolean(subject));
  const keywords = keywordSeed && keywordSeed.length ? keywordSeed : undefined;
  const links = cleanLinks({
    doi: doiValue ? `https://doi.org/${doiValue}` : undefined,
    pubmed: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}` : undefined
  });
  const flags = cleanFlags({
    open_access: Array.isArray(message.license) && message.license.length > 0,
    has_fulltext: Array.isArray(message.link) && message.link.length > 0
  });
  return {
    id: pmid ?? doiValue,
    pmid,
    doi: doiValue,
    title,
    authors: extractCrossrefAuthors(message.author),
    journal: message['container-title']?.[0]?.trim() ?? '',
    year: dateInfo.year,
    date: dateInfo.date,
    abstract: abstract || '',
    keywords,
    links,
    flags
  };
};

interface PubMedArticleId {
  text?: string | number;
  IdType?: string;
}

interface PubMedAuthor {
  LastName?: string;
  ForeName?: string;
  Initials?: string;
  CollectiveName?: string;
}

type PubMedKeyword = { text?: string } | string;

type PubMedDescriptor = { DescriptorName?: { text?: string } | string } | string;

interface PubMedDateNode {
  Year?: string | number;
  Month?: string;
  Day?: string | number;
  MedlineDate?: string;
}

interface PubMedArticleNode {
  ArticleDate?: PubMedDateNode | PubMedDateNode[];
  Journal?: {
    JournalIssue?: {
      PubDate?: PubMedDateNode;
    };
  };
}

interface PubMedCitationNode {
  Article?: PubMedArticleNode;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text',
  trimValues: true,
  processEntities: true,
  removeNSPrefix: true
});

const buildAuthorName = (author: PubMedAuthor): string | undefined => {
  if (author.CollectiveName) return author.CollectiveName.trim();
  const last = author.LastName?.trim();
  if (!last) return undefined;
  const initials = author.Initials?.trim();
  if (initials) return `${last} ${initials}`;
  const fore = author.ForeName?.trim();
  return fore ? `${last}, ${fore}` : last;
};

const buildAbstract = (abstractNode: unknown): string => {
  if (!abstractNode) return '';
  if (typeof abstractNode === 'string') return abstractNode.trim();
  if (Array.isArray(abstractNode)) {
    return abstractNode
      .map((node) => buildAbstract(node))
      .filter(Boolean)
      .join('\n');
  }
  if (typeof abstractNode === 'object') {
    const node = abstractNode as { text?: string; Label?: string };
    const text = node.text?.trim();
    if (!text) return '';
    return node.Label ? `${node.Label.trim()}: ${text}` : text;
  }
  return '';
};

const extractPubDate = (
  citation: PubMedCitationNode
): { year: number; date?: string } | undefined => {
  const articleDates = toArray<PubMedDateNode>(citation.Article?.ArticleDate);
  const articleDate = articleDates.find((entry) => entry?.Year);
  if (articleDate?.Year) {
    const month = monthToNumber(articleDate.Month) ?? articleDate.Month;
    const day = articleDate.Day;
    const date = buildDate([articleDate.Year, month, day]);
    return { year: Number(articleDate.Year), date };
  }
  const pubDate = citation.Article?.Journal?.JournalIssue?.PubDate;
  if (pubDate?.Year) {
    const month = monthToNumber(pubDate.Month) ?? pubDate.Month;
    const day = pubDate.Day;
    const date = buildDate([pubDate.Year, month, day]);
    return { year: Number(pubDate.Year), date };
  }
  if (typeof pubDate?.MedlineDate === 'string') {
    const match = pubDate.MedlineDate.match(/(\d{4})/);
    if (match) {
      return { year: Number(match[1]), date: match[1] };
    }
  }
  return undefined;
};

export const fetchPubMedMetadata = async (
  pmid: string,
  fetcher: Fetcher = defaultFetch
): Promise<RawPaper> => {
  const trimmed = pmid.trim();
  const query = new URLSearchParams({
    db: 'pubmed',
    id: trimmed,
    retmode: 'xml',
    tool: PUBMED_TOOL_NAME,
    email: PUBMED_TOOL_EMAIL
  });
  const target = `${PUBMED_EFETCH_ENDPOINT}?${query.toString()}`;
  const response = await fetcher(target, {
    headers: {
      Accept: 'application/xml'
    }
  });
  if (!response.ok) {
    throw new PaperLookupError(`PubMed lookup failed (${response.status} ${response.statusText})`);
  }
  const xml = await response.text();
  const parsed = parser.parse(xml);
  const article = parsed?.PubmedArticleSet?.PubmedArticle;
  const entry = Array.isArray(article) ? article[0] : article;
  if (!entry) {
    throw new PaperLookupError('PubMed response did not include an article record.');
  }
  const citation = entry.MedlineCitation;
  const articleInfo = citation?.Article;
  if (!citation || !articleInfo) {
    throw new PaperLookupError('PubMed record is missing core citation data.');
  }
  const pmidRaw = citation.PMID?.text ?? citation.PMID;
  const pmidValue = pmidRaw ? String(pmidRaw) : undefined;
  const title =
    typeof articleInfo.ArticleTitle === 'string'
      ? articleInfo.ArticleTitle.trim()
      : stripHtml(articleInfo.ArticleTitle?.text);
  if (!title) {
    throw new PaperLookupError('PubMed record is missing a title.');
  }
  const abstractText = buildAbstract(articleInfo.Abstract?.AbstractText ?? articleInfo.Abstract);
  const authorList = toArray<PubMedAuthor>(articleInfo.AuthorList?.Author).map(buildAuthorName);
  const authors = authorList.filter(Boolean) as string[];
  const keywords = toArray(articleInfo.KeywordList?.Keyword)
    .map((keyword: PubMedKeyword) => (typeof keyword === 'string' ? keyword : keyword?.text))
    .filter((keyword): keyword is string => Boolean(keyword))
    .map((keyword) => keyword.trim());
  const mesh = toArray(entry.MedlineCitation?.MeshHeadingList?.MeshHeading)
    .map((heading: PubMedDescriptor) => {
      if (!heading) return undefined;
      if (typeof heading === 'string') return heading.trim();
      const descriptor = heading.DescriptorName;
      if (!descriptor) return undefined;
      return typeof descriptor === 'string' ? descriptor.trim() : descriptor.text?.trim();
    })
    .filter((name): name is string => Boolean(name));
  const articleIds = toArray<PubMedArticleId | string | number>(
    entry.PubmedData?.ArticleIdList?.ArticleId
  ).map((entryId) => {
    if (typeof entryId === 'string' || typeof entryId === 'number') {
      return { text: String(entryId), IdType: undefined } satisfies PubMedArticleId;
    }
    return entryId;
  });
  const doiRaw = articleIds.find((id) => id?.IdType?.toLowerCase() === 'doi')?.text;
  const pmcidRaw = articleIds.find((id) => id?.IdType?.toLowerCase() === 'pmc')?.text;
  const doi = doiRaw ? String(doiRaw).trim() : undefined;
  const pmcid = pmcidRaw ? String(pmcidRaw).trim() : undefined;
  const dateInfo = extractPubDate(citation);
  if (!dateInfo?.year) {
    throw new PaperLookupError('PubMed record is missing a publication year.');
  }
  const journal = articleInfo.Journal?.Title?.trim?.() ?? '';
  const links = cleanLinks({
    pubmed: pmidValue ? `https://pubmed.ncbi.nlm.nih.gov/${pmidValue}` : undefined,
    doi: doi ? `https://doi.org/${doi}` : undefined,
    pmc: pmcid ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}` : undefined
  });
  const flags = cleanFlags({
    has_fulltext: Boolean(pmcid),
    open_access: Boolean(pmcid)
  });
  return {
    id: pmidValue ?? trimmed,
    pmid: pmidValue ?? trimmed,
    doi: doi ?? undefined,
    pmcid: pmcid ?? undefined,
    title,
    authors,
    journal,
    year: dateInfo.year,
    date: dateInfo.date,
    abstract: abstractText,
    mesh: mesh.length ? mesh : undefined,
    keywords: keywords.length ? keywords : undefined,
    country: citation.MedlineJournalInfo?.Country?.trim?.(),
    links,
    flags
  };
};

const mergeRecords = (preferred: RawPaper, fallback: RawPaper): RawPaper => {
  const links = cleanLinks({ ...fallback.links, ...preferred.links });
  const flags = cleanFlags({ ...fallback.flags, ...preferred.flags });
  return {
    ...fallback,
    ...preferred,
    authors: preferred.authors.length ? preferred.authors : fallback.authors,
    abstract: preferred.abstract || fallback.abstract || '',
    keywords: preferred.keywords?.length ? preferred.keywords : fallback.keywords,
    mesh: preferred.mesh?.length ? preferred.mesh : fallback.mesh,
    links,
    flags
  };
};

export const fetchPaperByIdentifier = async (
  options: { doi?: string; pmid?: string; pmcid?: string },
  fetcher: Fetcher = defaultFetch
): Promise<RawPaper> => {
  const { doi, pmid, pmcid } = options;
  if (!doi && !pmid && !pmcid) {
    throw new PaperLookupError('A DOI, PubMed ID, or PubMed Central ID is required.');
  }
  if (pmcid) {
    const resolvedPmid = await resolvePmidFromPmcid(pmcid, fetcher);
    return fetchPubMedMetadata(resolvedPmid, fetcher);
  }
  if (pmid) {
    return fetchPubMedMetadata(pmid, fetcher);
  }
  if (!doi) {
    throw new PaperLookupError('A DOI is required.');
  }
  const crossref = await fetchCrossrefMetadata(doi, fetcher);
  if (crossref.pmid) {
    try {
      const pubmed = await fetchPubMedMetadata(crossref.pmid, fetcher);
      return mergeRecords(pubmed, crossref);
    } catch (error) {
      if (error instanceof PaperLookupError) {
        return crossref;
      }
      throw error;
    }
  }
  return crossref;
};
