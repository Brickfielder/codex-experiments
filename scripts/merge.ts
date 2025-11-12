import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawPaper } from '../src/utils/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [input] = process.argv.slice(2);
if (!input) {
  console.error('Usage: npm run merge <path-to-json>');
  process.exit(1);
}

const resolve = (p: string) => path.resolve(process.cwd(), p);

const sourcePath = path.resolve(__dirname, '../data/papers.json');
const mergePath = resolve(input);

const existing: RawPaper[] = JSON.parse(readFileSync(sourcePath, 'utf-8'));
const additions: RawPaper[] = JSON.parse(readFileSync(mergePath, 'utf-8'));

const seenIds = new Set(existing.map((item) => item.id));
const merged = [...existing];
const skipped: string[] = [];
const added: string[] = [];

for (const candidate of additions) {
  if (seenIds.has(candidate.id)) {
    skipped.push(candidate.id);
    continue;
  }
  merged.push(candidate);
  seenIds.add(candidate.id);
  added.push(candidate.id);
}

writeFileSync(sourcePath, JSON.stringify(merged, null, 2));
console.log(`Merged ${added.length} new record(s) into papers.json.`);
if (skipped.length) {
  console.log(`Skipped ${skipped.length} existing record(s): ${skipped.join(', ')}`);
}
