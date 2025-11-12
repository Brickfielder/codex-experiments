import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  applySearch,
  buildFacets,
  createFuse,
  defaultSearchState,
  parseStateFromUrl,
  serializeStateToUrl,
  QUICK_FILTERS
} from '~/utils/search';
import type { Paper, SearchState } from '~/utils/types';
import { getPaperUrl, truncateAuthors } from '~/utils/format';

interface Props {
  papers: Paper[];
}

const useSearchState = (papers: Paper[]): [SearchState, (next: SearchState) => void] => {
  const defaults = useMemo(() => defaultSearchState(papers), [papers]);
  const [state, setState] = useState<SearchState>(() => {
    if (typeof window === 'undefined') {
      return defaults;
    }
    return parseStateFromUrl(new URL(window.location.href), defaults);
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const url = serializeStateToUrl(state, new URL(window.location.href));
    window.history.replaceState({}, '', url.toString());
  }, [state]);

  return [state, setState];
};

const toggleValue = (values: string[], value: string): string[] =>
  values.includes(value) ? values.filter((v) => v !== value) : [...values, value];

export default function BrowseClient({ papers }: Props) {
  const fuse = useMemo(() => createFuse(papers), [papers]);
  const facets = useMemo(() => buildFacets(papers), [papers]);
  const [state, setState] = useSearchState(papers);
  const results = useMemo(() => applySearch(papers, fuse, state), [papers, fuse, state]);
  const yearRange = useMemo(() => {
    const years = Object.keys(facets.years).map((y) => Number.parseInt(y, 10));
    if (!years.length) {
      const current = new Date().getFullYear();
      return [current, current] as [number, number];
    }
    return [Math.min(...years), Math.max(...years)] as [number, number];
  }, [facets.years]);

  const handleYearChange = (index: 0 | 1) => (event: Event) => {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    const next: [number, number] = [...state.years];
    next[index] = value;
    if (next[0] > next[1]) {
      if (index === 0) next[1] = value;
      else next[0] = value;
    }
    setState({ ...state, years: next });
  };

  const updateQuery = (event: Event) => {
    const value = (event.target as HTMLInputElement).value;
    setState({ ...state, query: value });
  };

  const buildFacetList = (
    items: Record<string, number>,
    selected: string[],
    key: keyof Pick<SearchState, 'domains' | 'settings' | 'designs' | 'countries' | 'journals'>
  ) => (
    <ul class="space-y-2">
      {Object.entries(items)
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => (
          <li key={value}>
            <label class="flex items-center justify-between gap-2 text-sm">
              <span>
                <input
                  type="checkbox"
                  class="mr-2"
                  checked={selected.includes(value)}
                  onChange={() =>
                    setState({
                      ...state,
                      [key]: toggleValue(selected, value)
                    })
                  }
                />
                {value}
              </span>
              <span class="text-xs text-slate-500">{count}</span>
            </label>
          </li>
        ))}
    </ul>
  );

  const quickFilterButtons = Object.keys(QUICK_FILTERS).map((label) => (
    <button
      key={label}
      type="button"
      class={`rounded-full border px-3 py-1 text-sm transition ${state.quickFilter === label ? 'border-blue-600 bg-blue-100 text-blue-700 dark:border-blue-400 dark:bg-blue-900/40 dark:text-blue-200' : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}
      aria-pressed={state.quickFilter === label}
      onClick={() =>
        setState({
          ...state,
          quickFilter: state.quickFilter === label ? undefined : label
        })
      }
    >
      {label}
    </button>
  ));

  return (
    <div class="flex flex-col gap-6 lg:flex-row">
      <aside class="lg:w-72 lg:flex-none">
        <div class="space-y-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p class="mb-2 text-sm font-semibold">Quick filters</p>
            <div class="flex flex-wrap gap-2">{quickFilterButtons}</div>
          </div>

          <div>
            <p class="mb-2 text-sm font-semibold">Year range</p>
            <div class="space-y-3">
              <div class="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span>{state.years[0]}</span>
                <span>{state.years[1]}</span>
              </div>
              <div class="space-y-2">
                <input
                  type="range"
                  min={yearRange[0]}
                  max={yearRange[1]}
                  value={state.years[0]}
                  onInput={handleYearChange(0)}
                  aria-label="Start year"
                />
                <input
                  type="range"
                  min={yearRange[0]}
                  max={yearRange[1]}
                  value={state.years[1]}
                  onInput={handleYearChange(1)}
                  aria-label="End year"
                />
              </div>
            </div>
          </div>

          <div>
            <p class="mb-2 text-sm font-semibold">Domain</p>
            {buildFacetList(facets.domains, state.domains, 'domains')}
          </div>

          <div>
            <p class="mb-2 text-sm font-semibold">Setting</p>
            {buildFacetList(facets.settings, state.settings, 'settings')}
          </div>

          <div>
            <p class="mb-2 text-sm font-semibold">Design</p>
            {buildFacetList(facets.designs, state.designs, 'designs')}
          </div>

          <div>
            <p class="mb-2 text-sm font-semibold">Country</p>
            {buildFacetList(facets.countries, state.countries, 'countries')}
          </div>

          <div>
            <p class="mb-2 text-sm font-semibold">Journal</p>
            {buildFacetList(facets.journals, state.journals, 'journals')}
          </div>
        </div>
      </aside>

      <section class="flex-1 space-y-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <label htmlFor="search" class="mb-2 block text-sm font-semibold">
            Search the repository
          </label>
          <input
            id="search"
            type="search"
            placeholder="Search by title, abstract, keywords, or author"
            value={state.query}
            onInput={updateQuery}
          />
        </div>
        <div class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 class="text-lg font-semibold">{results.length} papers</h2>
            <p class="text-sm text-slate-600 dark:text-slate-300">
              Sorted by relevance, then year (newest first)
            </p>
          </div>
          <button
            type="button"
            class="text-sm text-blue-600 hover:underline dark:text-blue-400"
            onClick={() => setState(defaultSearchState(papers))}
          >
            Reset filters
          </button>
        </div>
        <div class="space-y-4">
          {results.map((paper) => {
            const { display, remaining } = truncateAuthors(paper.normalizedAuthors);
            return (
              <article key={paper.id} class="card">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 class="text-lg font-semibold text-blue-700 dark:text-blue-300">
                      <a href={getPaperUrl(paper)}>{paper.title}</a>
                    </h3>
                    <p class="text-sm text-slate-600 dark:text-slate-300">
                      {display}
                      {remaining.length > 0 && (
                        <details class="inline">
                          <summary class="ml-1 cursor-pointer text-blue-600 dark:text-blue-400">
                            +{remaining.length} more
                          </summary>
                          <span class="ml-2 inline text-slate-600 dark:text-slate-300">
                            {remaining.join(', ')}
                          </span>
                        </details>
                      )}
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-2 text-sm text-slate-500 dark:text-slate-300">
                    <span>{paper.journal}</span>
                    <span aria-hidden="true">•</span>
                    <span>{paper.year}</span>
                  </div>
                </div>
                <p class="mt-3 text-sm text-slate-700 dark:text-slate-200">
                  {paper.abstract}
                  {paper.isAbstractTruncated && (
                    <span class="ml-1 text-xs uppercase text-orange-600">(Abstract truncated)</span>
                  )}
                </p>
                <div class="mt-3 flex flex-wrap gap-2">
                  {(paper.domains ?? []).map((domain) => (
                    <span key={domain} class="badge">
                      {domain}
                    </span>
                  ))}
                </div>
                <div class="mt-4 flex flex-wrap gap-3 text-sm">
                  {paper.links.pubmed && (
                    <a
                      class="btn-secondary"
                      href={paper.links.pubmed}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PubMed
                    </a>
                  )}
                  {paper.links.doi && (
                    <a
                      class="btn-secondary"
                      href={paper.links.doi}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      DOI
                    </a>
                  )}
                  {paper.links.pmc && (
                    <a
                      class="btn-secondary"
                      href={paper.links.pmc}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PMC
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
