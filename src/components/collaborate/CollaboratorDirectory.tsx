import { useMemo, useState } from 'preact/hooks';
import type { Collaborator } from '~/utils/types';

interface CollaboratorDirectoryProps {
  people: Collaborator[];
}

const textFields: (keyof Collaborator)[] = ['name', 'role', 'org', 'city', 'country', 'interests'];

const normalize = (value: string | undefined | null): string =>
  value?.toLowerCase().normalize('NFKD') ?? '';

const CollaboratorDirectory = ({ people }: CollaboratorDirectoryProps) => {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const tags = useMemo(() => {
    const tagSet = new Set<string>();
    people.forEach((person) => {
      person.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [people]);

  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query);
    return people.filter((person) => {
      if (activeTag && !person.tags?.includes(activeTag)) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const textValues = textFields
        .map((field) => {
          const value = person[field];
          return typeof value === 'string' ? normalize(value) : '';
        })
        .join(' ');
      const tagValues = person.tags?.map((tag) => normalize(tag)).join(' ') ?? '';
      const haystack = `${textValues} ${tagValues}`;
      return haystack.includes(normalizedQuery);
    });
  }, [people, query, activeTag]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-lg md:flex-row md:items-center">
        <label className="flex-1 text-sm font-semibold text-slate-600">
          <span className="sr-only">Search collaborators</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, organization, interest, or country"
            className="mt-1 w-full rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 text-base text-slate-800 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <a
          className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-rose-500"
          href="mailto:ohcacare@gmail.com?subject=Add%20me%20to%20the%20OHCA%20survivorship%20map"
        >
          Add your entry
        </a>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          className={`rounded-full border px-4 py-1 text-sm font-medium transition ${
            !activeTag
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700'
          }`}
          type="button"
          onClick={() => setActiveTag(null)}
        >
          All specialties
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            className={`rounded-full border px-4 py-1 text-sm font-medium capitalize transition ${
              activeTag === tag
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700'
            }`}
            type="button"
            onClick={() => setActiveTag(tag === activeTag ? null : tag)}
          >
            {tag.replace(/-/g, ' ')}
          </button>
        ))}
      </div>
      <p className="text-sm text-slate-500">
        Showing <strong>{filtered.length}</strong> of {people.length} collaborators
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((person) => (
          <article
            key={person.id}
            className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-md transition hover:-translate-y-0.5 hover:border-indigo-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">{person.name}</h4>
                <p className="text-sm text-slate-600">{person.role}</p>
              </div>
              {person.country ? (
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
                  {person.country}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm text-slate-600">{person.org}</p>
            <p className="mt-1 text-sm text-slate-500">
              {[person.city, person.country].filter(Boolean).join(', ')}
            </p>
            {person.interests ? (
              <p className="mt-3 text-sm text-slate-600">{person.interests}</p>
            ) : null}
            {person.tags?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {person.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600"
                  >
                    {tag.replace(/-/g, ' ')}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="mt-4 text-xs text-slate-400">Updated {person.updated_at ?? '—'}</p>
          </article>
        ))}
      </div>
    </div>
  );
};

export default CollaboratorDirectory;
