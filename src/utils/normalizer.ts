import type { RawPaper } from './types';

export interface NormalizedPaper extends RawPaper {
  normalizedAuthors: string[];
  isAbstractTruncated: boolean;
}

export const normalizeName = (name: string): string => {
  const cleaned = name.trim();
  if (!cleaned) return name;
  if (cleaned.includes(',')) {
    const [surname, given] = cleaned.split(',');
    const initials = (given ?? '')
      .split(/[-\s]+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join('');
    return `${surname.trim()} ${initials}`.trim();
  }
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return cleaned;
  const surname = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return `${surname} ${initials}`.trim();
};

const containsAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

export const inferDomains = (paper: RawPaper): string[] => {
  const seed = new Set((paper.domains ?? []).map((domain) => domain.toLowerCase()));
  const text = `${paper.title} ${paper.abstract} ${(paper.keywords ?? []).join(' ')}`.toLowerCase();
  const add = (domain: string, terms: string[]) => {
    if (
      containsAny(
        text,
        terms.map((term) => term.toLowerCase())
      )
    ) {
      seed.add(domain.toLowerCase());
    }
  };
  add('cognitive', ['moca', 'sdmt', 'neuropsych', 'cognitive']);
  add('psychological', ['hads', 'anxiety', 'depression', 'pts']);
  add('qol', ['eq-5d', 'quality of life', 'sf-36']);
  add('participation', ['return to work', 'mpai-4', 'community reintegration', 'employment']);
  add('caregiver', ['caregiver', 'zarit', 'family burden']);
  return Array.from(seed).map((domain) => domain.replace(/\b\w/g, (match) => match.toUpperCase()));
};

export const inferSetting = (paper: RawPaper): RawPaper['setting'] => {
  if (paper.setting) return paper.setting;
  const text = `${paper.title} ${paper.abstract}`.toLowerCase();
  if (text.includes('out-of-hospital') || text.includes('ohca')) return 'OHCA';
  if (text.includes('in-hospital') || text.includes('ihca')) return 'IHCA';
  if (text.includes('cardiac arrest')) return 'Mixed';
  return 'Unclear';
};

export const inferDesign = (paper: RawPaper): string | undefined => {
  if (paper.design) return paper.design;
  const text = `${paper.title} ${paper.abstract}`.toLowerCase();
  if (text.includes('randomized')) return 'Randomized controlled trial';
  if (text.includes('prospective')) return 'Prospective cohort';
  if (text.includes('retrospective')) return 'Retrospective cohort';
  if (text.includes('cross-sectional')) return 'Cross-sectional study';
  if (text.includes('mixed-method') || text.includes('mixed methods')) return 'Mixed methods';
  return undefined;
};

export const isAbstractTruncated = (abstract?: string) =>
  Boolean(abstract && abstract.trim().endsWith('...'));

export const deduplicate = (papers: RawPaper[]): RawPaper[] => {
  const seenDois = new Set<string>();
  const seenPmids = new Set<string>();
  const result: RawPaper[] = [];
  for (const paper of papers) {
    const doiKey = paper.doi?.toLowerCase();
    if (doiKey && seenDois.has(doiKey)) continue;
    if (doiKey) seenDois.add(doiKey);
    const pmidKey = paper.pmid?.toLowerCase();
    if (pmidKey && seenPmids.has(pmidKey)) continue;
    if (pmidKey) seenPmids.add(pmidKey);
    result.push(paper);
  }
  return result;
};

export const normalizeRecords = (papers: RawPaper[]): NormalizedPaper[] => {
  return deduplicate(papers)
    .map((paper) => {
      const normalizedAuthors = paper.authors?.map(normalizeName) ?? [];
      const domains = inferDomains(paper);
      const setting = inferSetting(paper);
      const design = inferDesign(paper) ?? paper.design;
      return {
        ...paper,
        domains,
        setting,
        design,
        normalizedAuthors,
        isAbstractTruncated: isAbstractTruncated(paper.abstract)
      };
    })
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
};
