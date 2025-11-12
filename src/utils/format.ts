import type { Paper } from './types';
import { getPaperPermalink } from './siteUrls';

export const truncateAuthors = (
  authors: string[],
  limit = 3
): { display: string; remaining: string[] } => {
  if (authors.length <= limit) {
    return { display: authors.join(', '), remaining: [] };
  }
  return {
    display: authors.slice(0, limit).join(', '),
    remaining: authors.slice(limit)
  };
};

export const formatYearRange = (papers: Paper[]): [number, number] => {
  if (papers.length === 0) {
    return [2000, new Date().getFullYear()];
  }
  const years = papers.map((p) => p.year);
  return [Math.min(...years), Math.max(...years)];
};

export const getPaperUrl = (paper: Paper): string => getPaperPermalink(paper.id);

export const isAbstractTruncated = (abstract: string): boolean => /\.\.\.$/.test(abstract.trim());
