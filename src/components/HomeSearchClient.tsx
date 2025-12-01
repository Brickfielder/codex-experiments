import { useMemo, useState } from 'preact/hooks';
import {
  applySearch,
  createFuse,
  defaultSearchState,
  serializeStateToUrl,
  type SearchState
} from '~/utils/search';
import { getPaperUrl, truncateAuthors } from '~/utils/format';
import type { Paper } from '~/utils/types';

interface HomeSearchClientProps {
  papers: Paper[];
  browseResultsHref: string;
}

const getPrimaryExternalLink = (paper: Paper): { href: string; label: string } | null => {
  if (paper.links?.pubmed) return { href: paper.links.pubmed, label: 'PubMed' };
  if (paper.links?.doi) return { href: paper.links.doi, label: 'DOI' };
  return null;
};

const toScopedUrl = (href: string): URL => {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return new URL(href, origin);
  } catch {
    return new URL('http://localhost');
  }
};

const buildBrowseLink = (baseWithHash: string, query: string, defaults: SearchState): string => {
  const [base, hash] = baseWithHash.split('#');
  const scoped = toScopedUrl(base);
  const state = { ...defaults, query: query.trim() };
  const serialized = serializeStateToUrl(state, scoped);
  const anchor = hash ? `#${hash}` : '';
  return `${serialized.pathname}${serialized.search}${anchor}`;
};

export default function HomeSearchClient({ papers, browseResultsHref }: HomeSearchClientProps) {
  const fuse = useMemo(() => createFuse(papers), [papers]);
  const defaults = useMemo(() => defaultSearchState(papers), [papers]);
  const [query, setQuery] = useState<string>('');

  const results = useMemo(() => {
    const state = { ...defaults, query };
    const filtered = applySearch(papers, fuse, state);
    return filtered.slice(0, 5);
  }, [defaults, fuse, papers, query]);

  const browseLink = useMemo(
    () => buildBrowseLink(browseResultsHref, query, defaults),
    [browseResultsHref, defaults, query]
  );

  return (
    <div class="relative z-10 space-y-4">
      <form
        class="relative flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-xl sm:flex-row sm:items-center sm:gap-0 sm:p-2"
        action={browseResultsHref}
        method="get"
      >
        <div class="relative w-full flex-1 sm:pl-2">
          <label class="sr-only" htmlFor="homepage-search">
            Search papers
          </label>
          <input
            id="homepage-search"
            name="q"
            type="search"
            value={query}
            onInput={(event) => setQuery((event.target as HTMLInputElement).value)}
            class="w-full flex-1 rounded-xl border border-slate-100 p-3 outline-none text-slate-900 placeholder-slate-400 md:p-4"
            placeholder="Search for fatigue, cognition, return to work..."
          />
        </div>
        <button
          class="w-full rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-slate-800 sm:w-auto"
          type="submit"
        >
          Search
        </button>
      </form>

      {query.trim() ? (
        <div class="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg">
          <div class="mb-3 flex items-center justify-between">
            <p class="text-sm font-semibold text-slate-700">Top matches</p>
            <a class="text-xs font-semibold text-indigo-600 hover:text-indigo-800" href={browseLink}>
              Open in full browse view →
            </a>
          </div>
          {results.length === 0 ? (
            <p class="text-sm text-slate-500">No matches found. Try adjusting your search.</p>
          ) : (
            <ul class="space-y-3">
              {results.map((paper) => {
                const { display, remaining } = truncateAuthors(paper.normalizedAuthors);
                const primaryLink = getPrimaryExternalLink(paper);
                return (
                  <li
                    key={paper.id}
                    class="rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-indigo-200 hover:bg-white hover:shadow-md"
                  >
                    <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <a
                        class="text-base font-semibold text-slate-900 hover:text-indigo-700"
                        href={getPaperUrl(paper)}
                      >
                        {paper.title}
                      </a>
                      <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {paper.year}
                      </span>
                    </div>
                    <p class="text-xs text-slate-600">
                      {display}
                      {remaining.length > 0 ? <span class="ml-1 text-slate-500">+{remaining.length} more</span> : null}
                    </p>
                    <div class="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>{paper.journal}</span>
                      {(paper.domains ?? []).slice(0, 2).map((domain) => (
                        <span
                          key={`${paper.id}-${domain}`}
                          class="rounded-full bg-white px-2 py-1 font-semibold uppercase tracking-wide text-indigo-700"
                        >
                          {domain}
                        </span>
                      ))}
                    </div>
                    <div class="mt-3 flex items-center gap-3 text-sm">
                      <a class="font-semibold text-slate-900 hover:text-indigo-700" href={getPaperUrl(paper)}>
                        View abstract
                      </a>
                      {primaryLink ? (
                        <a
                          class="text-slate-600 hover:text-blue-600"
                          href={primaryLink.href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {primaryLink.label}
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
