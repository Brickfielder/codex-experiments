import type { ComponentChildren } from 'preact';
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

interface PaperCardProps {
  paper: Paper;
}

const PaperCard = ({ paper }: PaperCardProps) => {
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
                <summary class="ml-1 cursor-pointer text-blue-600 dark:text-blue-400">+{remaining.length} more</summary>
                <span class="ml-2 inline text-slate-600 dark:text-slate-300">{remaining.join(', ')}</span>
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
      <details class="mt-3 rounded-2xl border border-indigo-50/70 bg-indigo-50/40 p-3 transition open:shadow-sm dark:border-indigo-900/60 dark:bg-indigo-900/10">
        <summary class="flex cursor-pointer items-center justify-between text-sm font-semibold text-indigo-700 transition hover:text-indigo-800 dark:text-indigo-200 dark:hover:text-indigo-100">
          <span>Abstract</span>
          <span class="text-xs font-bold uppercase tracking-wide text-indigo-500 dark:text-indigo-200">{'▼'}</span>
        </summary>
        <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-200">
          {paper.abstract}
          {paper.isAbstractTruncated && <span class="ml-1 text-xs uppercase text-orange-600">(Abstract truncated)</span>}
        </p>
      </details>
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
};

interface Props {
  papers: Paper[];
}

export default function BrowseClient({ papers }: Props) {
  const fuse = useMemo(() => createFuse(papers), [papers]);
  const facets = useMemo(() => buildFacets(papers), [papers]);
  const [state, setState] = useSearchState(papers);
  const visiblePapers = useMemo(() => applySearch(papers, fuse, state), [papers, fuse, state]);
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const yearRange = useMemo(() => {
    const years = Object.keys(facets.years).map((y) => Number.parseInt(y, 10));
    if (!years.length) {
      return [currentYear, currentYear] as [number, number];
    }
    return [Math.min(...years), Math.max(...years)] as [number, number];
  }, [facets.years, currentYear]);

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

  const FacetSection = ({
    title,
    children,
    defaultOpen = false
  }: {
    title: string;
    children: ComponentChildren;
    defaultOpen?: boolean;
  }) => (
    <details
      class="rounded-2xl border border-indigo-100/70 bg-indigo-50/40 p-3 transition open:bg-white/90 open:shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:open:bg-slate-900"
      open={defaultOpen}
    >
      <summary class="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-700 transition hover:text-indigo-700 dark:text-slate-200 dark:hover:text-indigo-200">
        <span>{title}</span>
        <span class="text-xs font-bold uppercase tracking-wide text-indigo-500 dark:text-indigo-200">{'▼'}</span>
      </summary>
      <div class="mt-3">{children}</div>
    </details>
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
    <div class="space-y-6">
      <div class="flex justify-center">
        <div class="w-full max-w-3xl rounded-3xl border border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/70 to-purple-50/60 p-6 text-center shadow-2xl shadow-indigo-100 ring-1 ring-indigo-100/80 backdrop-blur-lg transition dark:border-slate-800 dark:from-slate-900/90 dark:via-indigo-950/30 dark:to-slate-900/80 dark:shadow-none dark:ring-indigo-900/60">
          <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-600/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-800 ring-1 ring-indigo-200 shadow-sm dark:bg-indigo-900/40 dark:text-indigo-100 dark:ring-indigo-800">
            <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_0_6px_rgba(16,185,129,0.18)]"></span>
            Search the repository
          </div>
          <div class="relative">
            <div class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-indigo-500 dark:text-indigo-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.8"
                stroke="currentColor"
                class="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m21 21-4.35-4.35m0 0a7 7 0 1 0-9.9-9.9 7 7 0 0 0 9.9 9.9Z"
                />
              </svg>
            </div>
            <input
              id="search"
              type="search"
              placeholder="Search by title, abstract, keywords, or author"
              value={state.query}
              onInput={updateQuery}
              class="peer w-full appearance-none rounded-2xl border border-indigo-200/80 bg-white/90 px-12 py-4 text-base font-semibold text-slate-800 shadow-lg shadow-indigo-100 transition duration-200 placeholder:font-medium placeholder:text-slate-400 focus:-translate-y-0.5 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-indigo-50 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden dark:border-indigo-900/60 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-indigo-500 dark:focus:ring-indigo-700/60 dark:focus:ring-offset-slate-900"
            />
            <div class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-semibold uppercase tracking-wide text-indigo-500 opacity-0 transition-opacity duration-200 peer-focus:opacity-100 dark:text-indigo-200">
              Live match
            </div>
          </div>
          <p class="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
            Instant results, filter-friendly, and ready to share via copied links.
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-8 lg:flex-row">
        <aside class="lg:w-80 lg:flex-none">
          <div class="space-y-6 rounded-3xl border border-indigo-100/80 bg-white/95 p-5 shadow-xl ring-1 ring-indigo-50 backdrop-blur dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-800/80">
            <div>
              <p class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Quick filters
              </p>
              <div class="flex flex-wrap gap-2">{quickFilterButtons}</div>
            </div>

            <div>
              <p class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Year range
              </p>
              <div class="space-y-3">
                <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
                  <span>{state.years[0]}</span>
                  <span>{state.years[1] === currentYear ? 'Current' : state.years[1]}</span>
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

            <FacetSection title="Domain">
              {buildFacetList(facets.domains, state.domains, 'domains')}
            </FacetSection>

            <FacetSection title="Setting">
              {buildFacetList(facets.settings, state.settings, 'settings')}
            </FacetSection>

            <FacetSection title="Design">
              {buildFacetList(facets.designs, state.designs, 'designs')}
            </FacetSection>

            <FacetSection title="Country">
              {buildFacetList(facets.countries, state.countries, 'countries')}
            </FacetSection>

            <FacetSection title="Journal">
              {buildFacetList(facets.journals, state.journals, 'journals')}
            </FacetSection>
          </div>
        </aside>

        <section class="flex-1 space-y-5">
          <div class="flex flex-col gap-3 rounded-3xl border border-indigo-100/80 bg-white/95 p-5 shadow-xl ring-1 ring-indigo-50 backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-800/80">
            <div>
              <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {visiblePapers.length} papers
              </h2>
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
            {visiblePapers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
