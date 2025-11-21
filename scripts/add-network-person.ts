import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface NetworkPerson {
  name: string;
  email: string;
  role: string;
  org: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  interests: string;
  tags: string[];
  offer?: string;
  looking_to_collaborate_on?: string;
  id: string;
  updated_at: string;
}

interface ResuscitationNetworkDataset {
  meta: {
    title: string;
    updated_at: string;
    fields: string[];
  };
  people: NetworkPerson[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveRoot = (...segments: string[]) => path.resolve(__dirname, '..', ...segments);

const usage = `Usage: npm run add:network-person -- --name "<name>" --email "<email>" --role "<role>" \\n  --org "<organization>" --city "<city>" --country "<country>" [--interests "<text>"] [--tags "tag1,tag2"] \\n  [--offer "<text>"] [--looking_to_collaborate_on "<text>"] [--lat <value> --lng <value>]`;

type ParsedArgs = Record<string, string | undefined>;

const parseArgs = (argv: string[]): ParsedArgs => {
  const args: ParsedArgs = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const [flag, inlineValue] = token.split('=');
    const key = flag.replace(/^--/, '');
    const nextValue = argv[i + 1];
    const value = inlineValue ?? (nextValue && !nextValue.startsWith('--') ? nextValue : undefined);
    if (value && value === nextValue) {
      i += 1;
    }
    args[key] = value ?? '';
  }
  return args;
};

const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
};

const ensureUniqueId = (baseId: string, existing: NetworkPerson[]): string => {
  const normalized = baseId || 'network-person';
  let candidate = normalized;
  let counter = 2;
  const ids = new Set(existing.map((p) => p.id));
  while (ids.has(candidate)) {
    candidate = `${normalized}-${counter}`;
    counter += 1;
  }
  return candidate;
};

const parseTags = (raw: string | undefined): string[] => {
  if (!raw) return [];
  return raw
    .split(/[\n,]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
};

const readDataset = (filePath: string): ResuscitationNetworkDataset => {
  const data = JSON.parse(readFileSync(filePath, 'utf-8')) as ResuscitationNetworkDataset;
  return data;
};

const writeDataset = (filePath: string, dataset: ResuscitationNetworkDataset) => {
  const payload = `${JSON.stringify(dataset, null, 2)}\n`;
  writeFileSync(filePath, payload, 'utf-8');
};

const geocode = async (city: string, country: string): Promise<{ lat: number; lng: number }> => {
  const query = encodeURIComponent(`${city}, ${country}`);
  const url = `https://geocode.maps.co/search?q=${query}&format=json&limit=1`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'resuscitation-network-updater/1.0 (+https://github.com/resuscitation/repo)'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to geocode location (${response.status} ${response.statusText}).`);
  }
  const payload = (await response.json()) as Array<{ lat?: string; lon?: string }>;
  if (!payload.length) {
    throw new Error(`No geocoding results for ${city}, ${country}.`);
  }
  const { lat, lon } = payload[0];
  const parsedLat = lat ? Number.parseFloat(lat) : Number.NaN;
  const parsedLng = lon ? Number.parseFloat(lon) : Number.NaN;
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    throw new Error(`Invalid coordinates returned for ${city}, ${country}.`);
  }
  return { lat: parsedLat, lng: parsedLng };
};

const parseNumber = (raw: string | undefined, label: string): number | undefined => {
  if (raw === undefined || raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a valid number. Received: ${raw}`);
  }
  return value;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if ('help' in args || 'h' in args) {
    console.log(usage);
    process.exit(0);
  }
  const requiredFields: Array<{ key: keyof NetworkPerson | 'org'; label: string }> = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'org', label: 'Organization' },
    { key: 'city', label: 'City' },
    { key: 'country', label: 'Country' }
  ];

  const values: Record<string, string> = {};
  for (const field of requiredFields) {
    const raw = args[field.key];
    const normalized = raw?.trim();
    if (!normalized) {
      throw new Error(`${field.label} (--${field.key}) is required.\n${usage}`);
    }
    values[field.key] = normalized;
  }

  const interests = (args.interests ?? '').trim();
  const tags = parseTags(args.tags);
  const offer = (args.offer ?? '').trim();
  const lookingToCollaborateOn = (args.looking_to_collaborate_on ?? '').trim();

  const latArg = parseNumber(args.lat, 'Latitude');
  const lngArg = parseNumber(args.lng, 'Longitude');
  let coordinates: { lat: number; lng: number };
  if (latArg !== undefined && lngArg !== undefined) {
    coordinates = { lat: latArg, lng: lngArg };
  } else if (latArg !== undefined || lngArg !== undefined) {
    throw new Error('Both latitude and longitude must be provided when overriding coordinates.');
  } else {
    coordinates = await geocode(values.city, values.country);
  }

  const datasetPath = resolveRoot('data', 'resuscitation-network-people.json');
  const dataset = readDataset(datasetPath);
  const today = new Date().toISOString().slice(0, 10);
  const baseId = slugify(values.name);
  const id = ensureUniqueId(baseId, dataset.people);

  const record: NetworkPerson = {
    name: values.name,
    email: values.email,
    role: values.role,
    org: values.org,
    city: values.city,
    country: values.country,
    lat: coordinates.lat,
    lng: coordinates.lng,
    interests,
    tags,
    ...(offer ? { offer } : {}),
    ...(lookingToCollaborateOn ? { looking_to_collaborate_on: lookingToCollaborateOn } : {}),
    id,
    updated_at: today
  };

  dataset.people.push(record);
  dataset.people.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  dataset.meta.updated_at = today;

  writeDataset(datasetPath, dataset);

  console.log(`Added ${record.name} (id: ${record.id}).`);
  console.log(`Coordinates: ${record.lat.toFixed(6)}, ${record.lng.toFixed(6)}`);
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
