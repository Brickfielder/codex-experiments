import { useMemo, useState } from 'preact/hooks';
import type { Collaborator } from '~/utils/types';

interface CollaboratorDirectoryProps {
  people: Collaborator[];
}

const textFields: (keyof Collaborator)[] = [
  'name',
  'role',
  'org',
  'city',
  'country',
  'interests',
  'research_areas',
  'research_keywords',
  'offer',
  'looking_to_collaborate_on'
];

const normalize = (value: string | undefined | null): string =>
  value?.toLowerCase().normalize('NFKD') ?? '';

const CollaboratorDirectory = ({ people }: CollaboratorDirectoryProps) => {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-lg md:flex-row md:items-center">
        <label className="flex-1 text-sm font-semibold text-slate-600">
          <span className="sr-only">Search collaborators</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search by name, organization, interest, or country"
            className="mt-1 w-full rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 text-base text-slate-800 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <a
          className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-rose-500"
          href="mailto:hello@caresearchhub.org?subject=Add%20me%20to%20the%20OHCA%20survivorship%20map"
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
              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                {person.country ? (
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
                    {person.country}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => toggleExpanded(person.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
                >
                  {expandedIds.has(person.id) ? 'Hide details' : 'Show details'}
                  <span aria-hidden="true">{expandedIds.has(person.id) ? '–' : '+'}</span>
                </button>
              </div>
            </div>
            {expandedIds.has(person.id) ? (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <p className="text-sm text-slate-600">{person.org}</p>
                <p className="text-sm text-slate-500">
                  {[person.city, person.country].filter(Boolean).join(', ')}
                </p>
                {person.interests ? (
                  <p className="text-sm text-slate-600">{person.interests}</p>
                ) : null}
                {person.research_areas ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-700">Research areas</p>
                    <p className="text-sm text-slate-600">{person.research_areas}</p>
                  </div>
                ) : null}
                {person.research_keywords ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-700">Key words for your research area</p>
                    <p className="text-sm text-slate-600">{person.research_keywords}</p>
                  </div>
                ) : null}
                {person.offer ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-700">What I can offer</p>
                    <p className="text-sm text-slate-600">{person.offer}</p>
                  </div>
                ) : null}
                {person.looking_to_collaborate_on ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-700">Looking to collaborate on</p>
                    <p className="text-sm text-slate-600">{person.looking_to_collaborate_on}</p>
                  </div>
                ) : null}
                {person.tags?.length ? (
                  <div className="flex flex-wrap gap-2">
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
                <p className="text-xs text-slate-400">Updated {person.updated_at ?? '—'}</p>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
};

export default CollaboratorDirectory;
