#!/usr/bin/env node
/* eslint-env node */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv from 'ajv/dist/2020.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.resolve(__dirname, '../data/papers.schema.json');
const dataPath = path.resolve(__dirname, '../data/papers.json');

const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

let hasError = false;

if (!Array.isArray(data)) {
  console.error('Expected papers.json to be an array.');
  process.exitCode = 1;
  process.exit(1);
}

data.forEach((entry, index) => {
  const ok = validate(entry);
  if (!ok) {
    hasError = true;
    console.error(`Invalid record at index ${index} (id: ${entry?.id ?? 'unknown'}):`);
    console.error(validate.errors);
  }
});

if (hasError) {
  process.exit(1);
}

console.log(`Validated ${data.length} record(s) against papers.schema.json.`);
