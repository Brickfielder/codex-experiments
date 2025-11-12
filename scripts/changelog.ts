import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawPaper } from '../src/utils/types';
import { normalizeRecords } from '../src/utils/normalizer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const params: Record<string, string> = {};
for (const arg of args) {
  const [key, value] = arg.split('=');
  if (key && value) {
    params[key.replace(/^--/, '')] = value;
  }
}

const mode = params.mode ?? 'bi-monthly';
const summary = params.summary ?? '';

const targetPath = path.resolve(__dirname, '../CHANGELOG.md');
const currentData: RawPaper[] = JSON.parse(
  readFileSync(path.resolve(__dirname, '../data/papers.json'), 'utf-8')
);

let previousData: RawPaper[] = [];
try {
  const raw = execSync('git show HEAD^:data/papers.json', {
    stdio: ['ignore', 'pipe', 'ignore']
  }).toString();
  previousData = JSON.parse(raw);
} catch (error) {
  previousData = [];
}

const previousIds = new Set(previousData.map((paper) => paper.id));
const additions = currentData.filter((paper) => !previousIds.has(paper.id));

const normalizedAdditions = normalizeRecords(additions);
const years = Array.from(new Set(normalizedAdditions.map((paper) => paper.year))).sort();
const domains = Array.from(
  new Set(normalizedAdditions.flatMap((paper) => paper.domains ?? []))
).sort();
const journals = Array.from(new Set(normalizedAdditions.map((paper) => paper.journal))).sort();

const now = new Date();
const headerDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const lines = [
  `## ${headerDate} (${mode})`,
  summary ? `> ${summary}` : '',
  '',
  `- New papers: ${additions.length}`,
  `- Years represented: ${years.length ? years.join(', ') : '—'}`,
  `- Domains added: ${domains.length ? domains.join(', ') : '—'}`,
  `- Journals added: ${journals.length ? journals.join(', ') : '—'}`,
  '',
  normalizedAdditions.length
    ? normalizedAdditions
        .map((paper) => `  - ${paper.year} – ${paper.title} (${paper.journal})`)
        .join('\n')
    : '  - No new papers in this update.'
];

const entry = lines.filter(Boolean).join('\n');

let existing = '';
try {
  existing = readFileSync(targetPath, 'utf-8');
} catch (error) {
  existing = '# Changelog\n\n';
}

const updated = `${existing.trim()}\n\n${entry}\n`;
writeFileSync(targetPath, updated);
console.log(`Updated changelog with ${additions.length} new paper(s).`);
