import Fuse from 'fuse.js';
import type { Paper, SearchState } from './types';

export const QUICK_FILTERS: Record<string, string[]> = {
  Cognitive: ['cognitive'],
  Psychological: ['psychological'],
  QoL: ['qol', 'quality of life'],
  'Participation/RTW': ['participation', 'return to work'],
  Caregiver: ['caregiver'],
  'Return to Work': ['return to work', 'vocational', 'employment'],
  'Family/Key Supporter': ['caregiver', 'family', 'supporter']
};

const fuseOptions: Fuse.IFuseOptions<Paper> = {
  keys: [
    { name: 'title', weight: 0.5 },
    { name: 'abstract', weight: 0.3 },
    { name: 'keywords', weight: 0.15 },
    { name: 'authors', weight: 0.03 },
    { name: 'journal', weight: 0.02 }
  ],
  includeScore: true,
  includeMatches: true,
  shouldSort: true,
  useExtendedSearch: true,

  // Stricter matching to improve precision
  threshold: 0.25,
  distance: 200,
  ignoreLocation: false,
  minMatchCharLength: 3
};

export const createFuse = (papers: Paper[]): Fuse<Paper> => new Fuse(papers, fuseOptions);

const withinYearRange = (paper: Paper, years: [number, number]) =>
  paper.year >= years[0] && paper.year <= years[1];

const matchesFacetFilters = (paper: Paper, state: SearchState): boolean => {
  if (state.domains.length && !paper.domains?.some((domain) => state.domains.includes(domain))) {
    return false;
  }
  if (state.settings.length && (!paper.setting || !state.settings.includes(paper.setting))) {
    return false;
  }
  if (state.designs.length && (!paper.design || !state.designs.includes(paper.design))) {
    return false;
  }
  if (state.countries.length && (!paper.country || !state.countries.includes(paper.country))) {
    return false;
  }
  if (state.journals.length && !state.journals.includes(paper.journal)) {
    return false;
  }
  return true;
};

const matchesQuickFilters = (paper: Paper, state: SearchState): boolean => {
  if (!state.quickFilter) {
    return true;
  }
  const terms = QUICK_FILTERS[state.quickFilter] ?? [];
  if (!terms.length) return true;
  const text =
    `${paper.title} ${paper.abstract} ${(paper.keywords ?? []).join(' ')} ${(paper.domains ?? []).join(' ')}`.toLowerCase();
  return terms.some((term) => text.includes(term.toLowerCase()));
};

function buildExtendedQuery(raw: string): string {
  const tokens = raw
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 3);

  if (!tokens.length) return raw.trim();

  // `'token` = "include" operator in Fuse extended search
  // Joined with spaces = logical AND across tokens
  return tokens.map((t) => `'${t.toLowerCase()}`).join(' ');
}

function searchWithFallback(fuse: Fuse<Paper>, rawQuery: string, limit = 200) {
  const strictQuery = buildExtendedQuery(rawQuery);
  let results = fuse.search(strictQuery, { limit });

  // If strict extended search returns nothing, fall back to plain fuzzy
  if (!results.length) {
    results = fuse.search(rawQuery, { limit });
  }

  return results;
}

function isGoodMatch(result: Fuse.FuseResult<Paper>): boolean {
  const score = result.score ?? 1;

  // Drop very weak matches even if they technically clear the Fuse threshold
  if (score > 0.35) return false;

  // If we have match metadata, require that at least one match is
  // in a "content" field (title, abstract, keywords)
  if (result.matches && result.matches.length) {
    const hasContentMatch = result.matches.some(
      (m) => m.key === 'title' || m.key === 'abstract' || m.key === 'keywords'
    );

    if (!hasContentMatch) {
      // Hit only in authors/journal -> treat as noise for general queries
      return false;
    }
  }

  return true;
}

function scoreThenYearThenTitle(
  a: Fuse.FuseResult<Paper>,
  b: Fuse.FuseResult<Paper>
): number {
  const sa = a.score ?? 1;
  const sb = b.score ?? 1;
  if (sa !== sb) return sa - sb;

  const ya = a.item.year ?? 0;
  const yb = b.item.year ?? 0;
  if (ya !== yb) return yb - ya; // newer first

  return a.item.title.localeCompare(b.item.title);
}

function sortByYearThenTitleDesc(papers: Paper[]): Paper[] {
  return [...papers].sort((a, b) => {
    const ya = a.year ?? 0;
    const yb = b.year ?? 0;
    if (ya !== yb) return yb - ya; // newer first
    return a.title.localeCompare(b.title);
  });
}

export const applySearch = (allPapers: Paper[], state: SearchState): Paper[] => {
  const query = state.query?.trim() ?? '';

  const candidates = allPapers.filter((paper) => {
    if (!withinYearRange(paper, state.years)) return false;
    if (!matchesFacetFilters(paper, state)) return false;
    if (!matchesQuickFilters(paper, state)) return false;
    return true;
  });

  if (!query) {
    return sortByYearThenTitleDesc(candidates);
  }

  const fuse = new Fuse(candidates, fuseOptions);
  const searchResults = searchWithFallback(fuse, query, 200);
  const goodResults = searchResults.filter(isGoodMatch);

  return goodResults
    .sort(scoreThenYearThenTitle)
    .map((r) => r.item);
};

export interface FacetBuckets {
  years: Record<number, number>;
  domains: Record<string, number>;
  settings: Record<string, number>;
  designs: Record<string, number>;
  countries: Record<string, number>;
  journals: Record<string, number>;
}

export const buildFacets = (papers: Paper[]): FacetBuckets => {
  const buckets: FacetBuckets = {
    years: {},
    domains: {},
    settings: {},
    designs: {},
    countries: {},
    journals: {}
  };
  papers.forEach((paper) => {
    buckets.years[paper.year] = (buckets.years[paper.year] ?? 0) + 1;
    paper.domains?.forEach((domain) => {
      buckets.domains[domain] = (buckets.domains[domain] ?? 0) + 1;
    });
    if (paper.setting) {
      buckets.settings[paper.setting] = (buckets.settings[paper.setting] ?? 0) + 1;
    }
    if (paper.design) {
      buckets.designs[paper.design] = (buckets.designs[paper.design] ?? 0) + 1;
    }
    if (paper.country) {
      buckets.countries[paper.country] = (buckets.countries[paper.country] ?? 0) + 1;
    }
    buckets.journals[paper.journal] = (buckets.journals[paper.journal] ?? 0) + 1;
  });
  return buckets;
};

export const defaultSearchState = (papers: Paper[]): SearchState => {
  const years = papers.map((paper) => paper.year);
  const min = years.length ? Math.min(...years) : new Date().getFullYear();
  const max = years.length ? Math.max(...years) : new Date().getFullYear();
  return {
    query: '',
    years: [min, max],
    domains: [],
    settings: [],
    designs: [],
    countries: [],
    journals: [],
    quickFilter: undefined
  };
};

export const parseStateFromUrl = (url: URL, defaults: SearchState): SearchState => {
  const params = url.searchParams;
  const parseMulti = (key: string) => params.getAll(key).filter(Boolean);
  const parseRange = (key: string, fallback: [number, number]): [number, number] => {
    const raw = params.get(key);
    if (!raw) return fallback;
    const [start, end] = raw.split(':').map((v) => Number.parseInt(v, 10));
    if (Number.isNaN(start) || Number.isNaN(end)) return fallback;
    return [start, end];
  };
  return {
    query: params.get('q') ?? defaults.query,
    years: parseRange('years', defaults.years),
    domains: parseMulti('domain').length ? parseMulti('domain') : defaults.domains,
    settings: parseMulti('setting').length ? parseMulti('setting') : defaults.settings,
    designs: parseMulti('design').length ? parseMulti('design') : defaults.designs,
    countries: parseMulti('country').length ? parseMulti('country') : defaults.countries,
    journals: parseMulti('journal').length ? parseMulti('journal') : defaults.journals,
    quickFilter: params.get('quick') ?? defaults.quickFilter
  };
};

export const serializeStateToUrl = (state: SearchState, url: URL): URL => {
  const params = url.searchParams;
  if (state.query) {
    params.set('q', state.query);
  } else {
    params.delete('q');
  }
  params.set('years', `${state.years[0]}:${state.years[1]}`);
  const multi = [
    ['domain', state.domains],
    ['setting', state.settings],
    ['design', state.designs],
    ['country', state.countries],
    ['journal', state.journals]
  ] as const;
  multi.forEach(([key, values]) => {
    params.delete(key);
    values.forEach((value) => params.append(key, value));
  });
  if (state.quickFilter) {
    params.set('quick', state.quickFilter);
  } else {
    params.delete('quick');
  }
  return url;
};
