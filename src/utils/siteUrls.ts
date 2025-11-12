const REPO_BASE_URL = 'https://github.com/Brickfielder/codex-experiments';
const SITE_BASE_URL = 'https://brickfielder.github.io/codex-experiments';

const ensureTrailingSlash = (value: string): string => (value.endsWith('/') ? value : `${value}/`);

const joinUrl = (base: string, path = ''): string => {
  const normalizedBase = ensureTrailingSlash(base);
  const normalizedPath = path.replace(/^\/+/, '');
  return normalizedPath ? `${normalizedBase}${normalizedPath}` : normalizedBase;
};

const encodePaperId = (paperId: string): string =>
  Buffer.from(paperId, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const decodePaperSlug = (slug: string): string => {
  let normalized = slug.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  if (padding) {
    normalized = normalized.padEnd(normalized.length + (4 - padding), '=');
  }
  return Buffer.from(normalized, 'base64').toString('utf8');
};

export const parsePaperSlug = (slug: string): string => decodePaperSlug(slug);

export const repoBaseUrl = REPO_BASE_URL;
export const siteBaseUrl = SITE_BASE_URL;

export const getBrowseUrl = (): string => joinUrl(SITE_BASE_URL, 'browse');
export const getAboutUrl = (): string => joinUrl(SITE_BASE_URL, 'about');
export const getSiteUrl = (path = ''): string => joinUrl(SITE_BASE_URL, path);
export const getPaperSlug = (paperId: string): string => encodePaperId(paperId);
export const getPaperPermalink = (paperId: string): string => joinUrl(SITE_BASE_URL, `paper/${getPaperSlug(paperId)}`);
