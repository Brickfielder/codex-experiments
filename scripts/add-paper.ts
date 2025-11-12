import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawPaper } from '../src/utils/types';
import { normalizeRecords } from '../src/utils/normalizer';
import { fetchPaperByIdentifier, PaperLookupError } from '../src/utils/paperFetcher';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CliOptions {
  doi?: string;
  pmid?: string;
  dryRun?: boolean;
  pretty?: boolean;
}

const usage =
  `Usage: npm run add:paper -- (--doi <value> | --pmid <value>) [--dry-run]\n\n` +
  `Fetches metadata from Crossref and/or PubMed and appends it to data/papers.json.\n` +
  `Use --dry-run to print the derived record without modifying any files.`;

const parseArgs = (args: string[]): CliOptions => {
  const options: CliOptions = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--doi' && args[i + 1]) {
      options.doi = args[i + 1];
      i += 1;
      continue;
    }
    if (token.startsWith('--doi=')) {
      options.doi = token.split('=')[1];
      continue;
    }
    if (token === '--pmid' && args[i + 1]) {
      options.pmid = args[i + 1];
      i += 1;
      continue;
    }
    if (token.startsWith('--pmid=')) {
      options.pmid = token.split('=')[1];
      continue;
    }
    if (token === '--dry-run' || token === '--print') {
      options.dryRun = true;
      continue;
    }
    if (token === '--pretty') {
      options.pretty = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      console.log(usage);
      process.exit(0);
    }
  }
  return options;
};

const resolveRoot = (...segments: string[]) => path.resolve(__dirname, '..', ...segments);

const loadDataset = (filePath: string): RawPaper[] => {
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as RawPaper[];
};

const persistDataset = (filePath: string, records: RawPaper[]) => {
  writeFileSync(filePath, JSON.stringify(records, null, 2));
};

const sortRecords = (records: RawPaper[]) => {
  return [...records].sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
};

const hasDuplicate = (records: RawPaper[], candidate: RawPaper): string | undefined => {
  const candidateDoi = candidate.doi?.toLowerCase();
  const candidatePmid = candidate.pmid?.toLowerCase();
  for (const record of records) {
    if (record.id === candidate.id) return record.id;
    if (candidatePmid && record.pmid && record.pmid.toLowerCase() === candidatePmid) {
      return record.id;
    }
    if (candidateDoi && record.doi && record.doi.toLowerCase() === candidateDoi) {
      return record.id;
    }
  }
  return undefined;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (!options.doi && !options.pmid) {
    console.error(usage);
    process.exit(1);
  }
  try {
    const record = await fetchPaperByIdentifier({ doi: options.doi, pmid: options.pmid });
    if (options.dryRun) {
      console.log(JSON.stringify(record, null, options.pretty ? 2 : undefined));
      return;
    }
    const rawPath = resolveRoot('data', 'papers.json');
    const normalizedPath = resolveRoot('data', 'papers.normalized.json');
    const existing = loadDataset(rawPath);
    const duplicate = hasDuplicate(existing, record);
    if (duplicate) {
      console.error(`Record already exists in dataset (id: ${duplicate}).`);
      process.exit(1);
    }
    const updated = sortRecords([...existing, record]);
    persistDataset(rawPath, updated);
    const normalized = normalizeRecords(updated);
    writeFileSync(normalizedPath, JSON.stringify(normalized, null, 2));
    console.log(`Added ${record.id} → ${record.title}`);
    console.log(`Updated ${path.relative(process.cwd(), rawPath)} and normalized dataset.`);
  } catch (error) {
    if (error instanceof PaperLookupError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
};

void main();
