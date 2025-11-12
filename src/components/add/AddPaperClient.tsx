import { useMemo, useState } from 'preact/hooks';
import type { RawPaper } from '~/utils/types';

interface Props {
  apiUrl: string;
}

type IdentifierMode = 'doi' | 'pmid';

interface ApiSuccess {
  status: 'ok';
  persisted: boolean;
  total: number;
  record: RawPaper;
}

interface ApiDuplicate {
  status: 'duplicate';
  message: string;
  existingId: string;
}

interface ApiError {
  status: 'error';
  message: string;
}

type ApiResponse = ApiSuccess | ApiDuplicate | ApiError;

const formatList = (values?: string[]) =>
  values && values.length ? values.join(', ') : 'Not provided';

const buildLabel = (mode: IdentifierMode) => (mode === 'doi' ? 'DOI' : 'PubMed ID');

export default function AddPaperClient({ apiUrl }: Props) {
  const [mode, setMode] = useState<IdentifierMode>('doi');
  const [value, setValue] = useState('');
  const [dryRun, setDryRun] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    const trimmed = value.trim();
    setError(null);
    setResponse(null);

    if (!trimmed) {
      setError(`Enter a ${buildLabel(mode)} to continue.`);
      return;
    }

    setIsLoading(true);

    try {
      const payload = mode === 'doi' ? { doi: trimmed, dryRun } : { pmid: trimmed, dryRun };
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = (await res.json()) as ApiResponse;

      if (!res.ok) {
        setResponse(data);
        const fallback =
          'message' in data && typeof data.message === 'string'
            ? data.message
            : 'Unable to complete request.';
        setError(fallback);
        return;
      }

      setResponse(data);
    } catch (err) {
      console.error(err);
      setError('Unexpected error reaching the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const success = useMemo(() => {
    if (!response || response.status !== 'ok') return null;
    return response;
  }, [response]);

  const duplicate = useMemo(() => {
    if (!response || response.status !== 'duplicate') return null;
    return response;
  }, [response]);

  return (
    <div class="space-y-8">
      <form
        class="space-y-6 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl ring-1 ring-indigo-100 backdrop-blur dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-800/80"
        onSubmit={handleSubmit}
      >
        <div class="grid gap-4 md:grid-cols-[minmax(0,_220px)_1fr] md:items-end">
          <div class="space-y-2">
            <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">Identifier type</p>
            <div class="flex gap-3">
              {(['doi', 'pmid'] as IdentifierMode[]).map((option) => {
                const isActive = option === mode;
                return (
                  <button
                    key={option}
                    class={`rounded-2xl border px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-100/80 text-indigo-700 shadow-sm dark:border-indigo-400 dark:bg-indigo-900/40 dark:text-indigo-200'
                        : 'border-slate-200/80 bg-white/80 text-slate-600 hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                    type="button"
                    onClick={() => setMode(option)}
                  >
                    {option === 'doi' ? 'DOI' : 'PubMed ID'}
                  </button>
                );
              })}
            </div>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-slate-600 dark:text-slate-300" htmlFor="identifier-input">
              {buildLabel(mode)}
            </label>
            <input
              id="identifier-input"
              class="w-full rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 text-base shadow-inner transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-400"
              type="text"
              placeholder={mode === 'doi' ? '10.xxxx/xxxxx' : '12345678'}
              value={value}
              onInput={(event) => setValue((event.target as HTMLInputElement).value)}
            />
          </div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <label class="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:checked:bg-indigo-500"
              checked={dryRun}
              onChange={(event) => setDryRun((event.target as HTMLInputElement).checked)}
            />
            Preview only (do not update datasets)
          </label>
          <button
            type="submit"
            class="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg
                  class="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M8.757 15.243l-2.121 2.121m0-12.728l2.121 2.121m8.486 8.486l2.121 2.121" />
                </svg>
                Looking up metadata…
              </>
            ) : (
              <>
                <svg
                  aria-hidden="true"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2" />
                </svg>
                Fetch metadata
              </>
            )}
          </button>
        </div>
        {error && (
          <p class="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-400/60 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </p>
        )}
        {duplicate && (
          <p class="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/60 dark:bg-amber-900/30 dark:text-amber-200">
            {duplicate.message} (existing id: {duplicate.existingId})
          </p>
        )}
      </form>

      {success && (
        <div class="space-y-6 rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-xl ring-1 ring-indigo-100 backdrop-blur dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-800/80">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">Metadata imported</p>
              <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{success.record.title}</h2>
            </div>
            <span class={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              success.persisted
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                : 'bg-slate-200 text-slate-600 dark:bg-slate-700/60 dark:text-slate-200'
            }`}>
              {success.persisted ? 'Added to dataset' : 'Preview only'}
            </span>
          </div>
          <dl class="grid gap-4 md:grid-cols-2">
            <div>
              <dt class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Journal</dt>
              <dd class="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">{success.record.journal}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Year</dt>
              <dd class="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">{success.record.year}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Authors</dt>
              <dd class="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatList(success.record.authors)}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Keywords</dt>
              <dd class="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatList(success.record.keywords)}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">DOI</dt>
              <dd class="mt-1 text-sm text-indigo-600 dark:text-indigo-300">{success.record.doi ?? 'Not provided'}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">PubMed</dt>
              <dd class="mt-1 text-sm text-indigo-600 dark:text-indigo-300">{success.record.pmid ?? 'Not provided'}</dd>
            </div>
          </dl>
          <div class="space-y-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-slate-200">
            <p>
              {success.persisted
                ? `data/papers.json and data/papers.normalized.json now contain ${success.total.toLocaleString()} records.`
                : 'Run without preview enabled to update the datasets.'}
            </p>
            {success.record.abstract && (
              <details class="group">
                <summary class="cursor-pointer text-sm font-semibold text-indigo-600 transition group-open:text-indigo-700 dark:text-indigo-300">
                  View abstract
                </summary>
                <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-200">{success.record.abstract}</p>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
