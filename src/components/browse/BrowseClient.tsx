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
            <label class="flex items-center justify-between gap-2 rounded-2xl border border-transparent px-2 py-1 text-sm text-slate-600 transition hover:border-indigo-100 hover:bg-indigo-50/60 dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-900/20">
              <span class="flex items-center">
                <input
                  type="checkbox"
                  class="mr-2 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:checked:bg-indigo-500"
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
              <span class="text-xs font-semibold text-slate-400 dark:text-slate-500">{count}</span>
            </label>
          </li>
        ))}
    </ul>
  );

  const quickFilterButtons = Object.keys(QUICK_FILTERS).map((label) => {
    const isActive = state.quickFilter === label;
    const base =
      'rounded-full px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300';
    const active =
      'border border-indigo-500 bg-indigo-100/80 text-indigo-700 shadow-sm dark:border-indigo-400 dark:bg-indigo-900/40 dark:text-indigo-200';
    const inactive =
      'border border-slate-200/80 bg-white/70 text-slate-600 hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
    return (
      <button
        key={label}
        type="button"
        class={`${base} ${isActive ? active : inactive}`}
        aria-pressed={isActive}
        onClick={() =>
          setState({
            ...state,
            quickFilter: isActive ? undefined : label
          })
        }
      >
        {label}
      </button>
    );
  });

  return (
    <div class="flex flex-col gap-8 lg:flex-row">
      <aside class="lg:w-80 lg:flex-none">
        <div
          class="space-y-6 rounded-3xl border border-indigo-100/80 bg-white/95 p-5 shadow-xl ring-1 ring-indigo-50 backdrop-blur dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-800/80"
        >
          <div>
            <p class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Quick filters</p>
            <div class="flex flex-wrap gap-2">{quickFilterButtons}</div>
          </div>

          <div>
            <p class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Year range</p>
            <div class="space-y-3">
              <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
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
                  class="w-full accent-indigo-600"
                />
                <input
                  type="range"
                  min={yearRange[0]}
                  max={yearRange[1]}
                  value={state.years[1]}
                  onInput={handleYearChange(1)}
                  aria-label="End year"
                  class="w-full accent-indigo-600"
                />
              </div>
            </div>
          </div>

          <div>
            <p class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Domain</p>
            {buildFacetList(facets.domains, state.domains, 'domains')}
          </div>

          <div>
            <p class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Setting</p>
            {buildFacetList(facets.settings, state.settings, 'settings')}
          </div>

          <div>
            <p class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Design</p>
            {buildFacetList(facets.designs, state.designs, 'designs')}
          </div>

          <div>
            <p class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Country</p>
            {buildFacetList(facets.countries, state.countries, 'countries')}
          </div>

          <div>
            <p class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Journal</p>
            {buildFacetList(facets.journals, state.journals, 'journals')}
          </div>
        </div>
      </aside>

      <section class="flex-1 space-y-5">
        <div class="rounded-3xl border border-indigo-100/80 bg-white/95 p-6 shadow-xl ring-1 ring-indigo-50 backdrop-blur dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-800/80">
          <label htmlFor="search" class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
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
        <div class="flex flex-col gap-3 rounded-3xl border border-indigo-100/80 bg-white/95 p-5 shadow-xl ring-1 ring-indigo-50 backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-800/80">
          <div>
            <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">{results.length} papers</h2>
            <p class="text-sm text-slate-600 dark:text-slate-300">
              Sorted by relevance, then year (newest first)
            </p>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-4 py-1.5 text-sm font-semibold text-indigo-600 transition hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-300"
            onClick={() => setState(defaultSearchState(papers))}
          >
            Reset filters
          </button>
        </div>
        <div class="space-y-4">
          {results.map((paper) => {
            const { display, remaining } = truncateAuthors(paper.normalizedAuthors);
            return (
              <article
                key={paper.id}
                class="group rounded-3xl border border-white/70 bg-white/95 p-6 shadow-xl ring-1 ring-indigo-50 transition hover:-translate-y-1 hover:shadow-2xl dark:border-slate-800/80 dark:bg-slate-900 dark:ring-slate-800/60"
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 class="text-lg font-semibold text-slate-900 transition group-hover:text-indigo-600 dark:text-slate-100">
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
                <p class="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-200">
                  {paper.abstract}
                  {paper.isAbstractTruncated && (
                    <span class="ml-1 text-xs uppercase text-orange-600">(Abstract truncated)</span>
                  )}
                </p>
                <div class="mt-4 flex flex-wrap gap-2">
                  {(paper.domains ?? []).map((domain) => (
                    <span
                      key={domain}
                      class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"
                    >
                      {domain}
                    </span>
                  ))}
                </div>
                <div class="mt-5 flex flex-wrap gap-2 text-sm">
                  {paper.links.pubmed && (
                    <a
                      class="inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-900/20 dark:text-indigo-200"
                      href={paper.links.pubmed}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PubMed
                    </a>
                  )}
                  {paper.links.doi && (
                    <a
                      class="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
                      href={paper.links.doi}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      DOI
                    </a>
                  )}
                  {paper.links.pmc && (
                    <a
                      class="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
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
