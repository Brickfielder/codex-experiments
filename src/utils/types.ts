export interface PaperLinks {
  pubmed?: string;
  doi?: string;
  pmc?: string;
}

export interface PaperFlags {
  open_access?: boolean;
  has_fulltext?: boolean;
}

export interface RawPaper {
  id: string;
  pmid?: string;
  doi?: string;
  pmcid?: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  date?: string;
  abstract: string;
  mesh?: string[];
  keywords?: string[];
  domains?: string[];
  setting?: 'OHCA' | 'IHCA' | 'Mixed' | 'Unclear';
  design?: string;
  country?: string;
  corrCountryCode?: string;
  corrCountryName?: string;
  links: PaperLinks;
  flags?: PaperFlags;
}

export interface Paper extends RawPaper {
  normalizedAuthors: string[];
  isAbstractTruncated: boolean;
}

export interface SearchState {
  query: string;
  years: [number, number];
  domains: string[];
  settings: string[];
  designs: string[];
  countries: string[];
  journals: string[];
  quickFilter?: string;
}

export interface Collaborator {
  id: string;
  name: string;
  email?: string;
  role?: string;
  org?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  interests?: string;
  tags?: string[];
  updated_at?: string;
}
