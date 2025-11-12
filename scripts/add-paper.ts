import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawPaper } from '../src/utils/types';
import { normalizeRecords } from '../src/utils/normalizer';
import { fetchPaperByIdentifier, PaperLookupError } from '../src/utils/paperFetcher';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type IdType = 'DOI' | 'PMID' | 'PMCID';

interface CliOptions {
  doi?: string;
  pmid?: string;
  pmcid?: string;
  idType?: IdType;
  identifier?: string;
  preview?: boolean;
  dryRun?: boolean;
  pretty?: boolean;
}

const usage =
  `Usage: npm run add:paper -- (--doi <value> | --pmid <value> | --pmcid <value>) [--dry-run]\n` +
  `       npm run add:paper -- --id-type <DOI|PMID|PMCID> --id <value> [--preview <true|false>]\n\n` +
  `Fetches metadata from Crossref and/or PubMed and appends it to data/papers.json.\n` +
  `Use --dry-run or --preview true to print the derived record without modifying any files.`;

const parseArgs = (args: string[]): CliOptions => {
  const options: CliOptions = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    const [flag, inlineValue] = token.split('=');
    const nextValue = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : undefined;
    const value = inlineValue ?? nextValue;

    const consumeValue = () => {
      if (value && value === nextValue) {
        i += 1;
      }
      return value;
    };

    switch (flag) {
      case '--doi':
        options.doi = consumeValue();
        continue;
      case '--pmid':
        options.pmid = consumeValue();
        continue;
      case '--pmcid':
        options.pmcid = consumeValue();
        continue;
      case '--id-type': {
        const raw = consumeValue();
        if (raw) options.idType = raw.toUpperCase() as IdType;
        continue;
      }
      case '--id':
        options.identifier = consumeValue();
        continue;
      case '--preview': {
        const raw = consumeValue();
        if (raw === undefined) {
          options.preview = true;
        } else {
          const normalized = raw.trim().toLowerCase();
          options.preview = normalized === 'true' || normalized === '1';
        }
        continue;
      }
      case '--dry-run':
      case '--print':
        options.dryRun = true;
        continue;
      case '--pretty':
        options.pretty = true;
        continue;
      case '--help':
      case '-h':
        console.log(usage);
        process.exit(0);
        break;
      default:
        break;
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
  const candidatePmcid = candidate.pmcid?.toLowerCase();
  for (const record of records) {
    if (record.id === candidate.id) return record.id;
    if (candidatePmid && record.pmid && record.pmid.toLowerCase() === candidatePmid) {
      return record.id;
    }
    if (candidatePmcid && record.pmcid && record.pmcid.toLowerCase() === candidatePmcid) {
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
  const idType = options.idType ?? (options.doi ? 'DOI' : options.pmid ? 'PMID' : options.pmcid ? 'PMCID' : undefined);
  const identifier =
    options.identifier ?? options.doi ?? options.pmid ?? options.pmcid ?? undefined;
  if (!idType || !identifier) {
    console.error(usage);
    process.exit(1);
  }
  if (!['DOI', 'PMID', 'PMCID'].includes(idType)) {
    console.error(`Invalid id type: ${idType}. Expected DOI, PMID, or PMCID.`);
    process.exit(1);
  }
  try {
    const normalizedId = identifier.trim();
    if (!normalizedId) {
      console.error('Identifier must not be empty.');
      process.exit(1);
    }
    const fetchOptions =
      idType === 'DOI'
        ? { doi: normalizedId }
        : idType === 'PMID'
        ? { pmid: normalizedId }
        : { pmcid: normalizedId };
    const preview = options.preview ?? options.dryRun ?? false;
    const record = await fetchPaperByIdentifier(fetchOptions);
    if (preview) {
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
