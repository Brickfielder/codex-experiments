import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawPaper } from '../src/utils/types';
import { normalizeRecords } from '../src/utils/normalizer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcePath = path.resolve(__dirname, '../data/papers.json');
const targetPath = path.resolve(__dirname, '../data/papers.normalized.json');

const rawData = JSON.parse(readFileSync(sourcePath, 'utf-8')) as RawPaper[];

const normalized = normalizeRecords(rawData);

writeFileSync(targetPath, JSON.stringify(normalized, null, 2));
console.log(
  `Normalized ${normalized.length} record(s) -> ${path.relative(process.cwd(), targetPath)}`
);
