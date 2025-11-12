import {
  deduplicate,
  inferDesign,
  inferDomains,
  inferSetting,
  normalizeName,
  normalizeRecords
} from '../src/utils/normalizer';
import type { RawPaper } from '../src/utils/types';

describe('normalizeName', () => {
  it('handles comma separated names', () => {
    expect(normalizeName('Doe, Jane Marie')).toBe('Doe JM');
  });

  it('handles space separated names', () => {
    expect(normalizeName('Jane Marie Doe')).toBe('Doe JM');
  });
});

describe('deduplicate', () => {
  it('removes duplicates by DOI and PMID', () => {
    const papers: RawPaper[] = [
      {
        id: '1',
        title: 'A',
        authors: ['Jane Doe'],
        journal: 'J1',
        year: 2024,
        abstract: 'Test',
        links: {},
        doi: '10.1000/xyz'
      },
      {
        id: '2',
        title: 'B',
        authors: ['John Doe'],
        journal: 'J2',
        year: 2024,
        abstract: 'Test',
        links: {},
        doi: '10.1000/xyz'
      },
      {
        id: '3',
        title: 'C',
        authors: ['A'],
        journal: 'J3',
        year: 2024,
        abstract: 'Test',
        links: {},
        pmid: '123'
      },
      {
        id: '4',
        title: 'D',
        authors: ['A'],
        journal: 'J4',
        year: 2024,
        abstract: 'Test',
        links: {},
        pmid: '123'
      }
    ];

    const deduped = deduplicate(papers);
    expect(deduped).toHaveLength(2);
  });
});

describe('inference helpers', () => {
  const base: RawPaper = {
    id: '5',
    title: 'Cardiac arrest study',
    authors: ['Jane Doe'],
    journal: 'J',
    year: 2024,
    abstract: 'Using MoCA and return to work outcomes.',
    keywords: ['Zarit scale'],
    links: {}
  };

  it('infers domains from keywords', () => {
    const domains = inferDomains(base);
    expect(domains).toEqual(expect.arrayContaining(['Cognitive', 'Participation', 'Caregiver']));
  });

  it('infers setting from text', () => {
    expect(inferSetting(base)).toBe('Mixed');
    expect(inferSetting({ ...base, setting: 'OHCA' })).toBe('OHCA');
    expect(inferSetting({ ...base, title: 'OHCA outcomes', abstract: '' })).toBe('OHCA');
  });

  it('infers design from keywords', () => {
    const design = inferDesign({
      ...base,
      abstract: 'A randomized trial with prospective follow-up.'
    });
    expect(design).toBe('Randomized controlled trial');
  });
});

describe('normalizeRecords', () => {
  it('produces enriched records sorted by year desc', () => {
    const papers: RawPaper[] = [
      {
        id: 'a',
        title: 'Older',
        authors: ['Jane Doe'],
        journal: 'J',
        year: 2023,
        abstract: 'Summary',
        links: {}
      },
      {
        id: 'b',
        title: 'Newer',
        authors: ['John Doe'],
        journal: 'J',
        year: 2024,
        abstract: 'Summary...',
        links: {}
      }
    ];
    const normalized = normalizeRecords(papers);
    expect(normalized[0].id).toBe('b');
    expect(normalized[0].normalizedAuthors[0]).toBe('Doe J');
    expect(normalized[0].isAbstractTruncated).toBe(true);
  });
});
