import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawPaper } from '../src/utils/types';
import { normalizeRecords } from '../src/utils/normalizer';
import { enrichCountryForPaper } from '../src/utils/geoEnrichment';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveRoot = (...segments: string[]) => path.resolve(__dirname, '..', ...segments);

const loadDataset = (filePath: string): RawPaper[] => {
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as RawPaper[];
};

const persistDataset = (filePath: string, records: RawPaper[]) => {
  writeFileSync(filePath, JSON.stringify(records, null, 2));
};

const main = async () => {
  const dryRun = process.argv.includes('--dry-run');
  const rawPath = resolveRoot('data', 'papers.json');
  const normalizedPath = resolveRoot('data', 'papers.normalized.json');
  const records = loadDataset(rawPath);
  const targets = records.filter((paper) => !paper.country && !paper.corrCountryName);

  if (targets.length === 0) {
    console.log('No papers are missing country metadata.');
    return;
  }

  console.log(`Found ${targets.length} papers missing country metadata. Enriching via Crossref...`);

  const enrichedById = new Map<string, RawPaper>();
  let enrichedCount = 0;

  for (const paper of targets) {
    const updated = await enrichCountryForPaper(paper);
    const hasNewCountry = Boolean(updated.corrCountryName && updated.corrCountryName !== paper.corrCountryName);
    if (hasNewCountry) {
      enrichedCount += 1;
      console.log(`✓ ${paper.id} → ${updated.corrCountryName} (${updated.corrCountryCode ?? '??'})`);
    } else {
      console.log(`- ${paper.id} (no country inferred)`);
    }
    enrichedById.set(paper.id, updated);
  }

  const updatedRecords = records.map((paper) => enrichedById.get(paper.id) ?? paper);

  if (dryRun) {
    console.log(`Dry run complete. ${enrichedCount} papers would be updated.`);
    return;
  }

  persistDataset(rawPath, updatedRecords);
  const normalized = normalizeRecords(updatedRecords);
  writeFileSync(normalizedPath, JSON.stringify(normalized, null, 2));

  console.log(`Updated ${enrichedCount} papers with inferred country data.`);
  console.log(`Wrote changes to ${path.relative(process.cwd(), rawPath)} and normalized dataset.`);
};

void main();
