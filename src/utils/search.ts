import Fuse from 'fuse.js';
import type { IFuseOptions } from 'fuse.js';
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

const fuseOptions: IFuseOptions<Paper> = {
  includeScore: true,
  keys: [
    { name: 'title', weight: 3 },
    { name: 'abstract', weight: 4 },
    'keywords',
    'authors',
    'journal'
  ],
  threshold: 0.2,
  ignoreLocation: true,
  minMatchCharLength: 3,
  useExtendedSearch: true
};

export const createFuse = (papers: Paper[]): Fuse<Paper> => new Fuse(papers, { ...fuseOptions });

const withinYearRange = (paper: Paper, years: [number, number]) =>
  paper.year >= years[0] && paper.year <= years[1];

const matchesFilter = (paper: Paper, state: SearchState): boolean => {
  if (!withinYearRange(paper, state.years)) {
    return false;
  }
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
  if (state.quickFilter) {
    const terms = QUICK_FILTERS[state.quickFilter] ?? [];
    if (!terms.length) return true;
    const text =
      `${paper.title} ${paper.abstract} ${(paper.keywords ?? []).join(' ')} ${(paper.domains ?? []).join(' ')}`.toLowerCase();
    return terms.some((term) => text.includes(term.toLowerCase()));
  }
  return true;
};

export const applySearch = (papers: Paper[], fuse: Fuse<Paper>, state: SearchState): Paper[] => {
  const base = state.query
    ? fuse.search(state.query).map((item) => ({ paper: item.item, score: item.score ?? 1 }))
    : papers.map((paper) => ({ paper, score: 1 }));

  const filtered = base.filter(({ paper }) => matchesFilter(paper, state));
  return filtered
    .sort((a, b) => {
      if (a.score === b.score) {
        return b.paper.year - a.paper.year;
      }
      return a.score - b.score;
    })
    .map(({ paper }) => paper);
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
