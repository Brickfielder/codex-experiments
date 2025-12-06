import { defaultLang } from '../i18n/ui';

const ensureTrailingSlash = (value: string): string => (value.endsWith('/') ? value : `${value}/`);

const joinUrl = (base: string, path = ''): string => {
  const normalizedBase = ensureTrailingSlash(base);
  const normalizedPath = path.replace(/^\/+/, '');
  return normalizedPath ? `${normalizedBase}${normalizedPath}` : normalizedBase;
};

const REPO_BASE_URL = 'https://github.com/Brickfielder/codex-experiments';

const SITE_BASE_URL = ensureTrailingSlash(
  import.meta.env.SITE ?? import.meta.env.BASE_URL ?? '/'
);

const hasBuffer = typeof Buffer !== 'undefined';

const encodeBase64 = (value: string): string => {
  if (hasBuffer) {
    return Buffer.from(value, 'utf8').toString('base64');
  }
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const decodeBase64 = (value: string): string => {
  if (hasBuffer) {
    return Buffer.from(value, 'base64').toString('utf8');
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
};

const encodePaperId = (paperId: string): string =>
  encodeBase64(paperId).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const decodePaperSlug = (slug: string): string => {
  let normalized = slug.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  if (padding) {
    normalized = normalized.padEnd(normalized.length + (4 - padding), '=');
  }
  return decodeBase64(normalized);
};

export const parsePaperSlug = (slug: string): string => decodePaperSlug(slug);

export const repoBaseUrl = REPO_BASE_URL;
export const siteBaseUrl = SITE_BASE_URL;

const getLocalizedBase = (lang?: string) => {
  if (!lang || lang === defaultLang) return SITE_BASE_URL;
  return joinUrl(SITE_BASE_URL, lang);
}

export const getBrowseUrl = (lang?: string): string => joinUrl(getLocalizedBase(lang), 'browse');
export const getAboutUrl = (lang?: string): string => joinUrl(getLocalizedBase(lang), 'about');
export const getHeatmapUrl = (lang?: string): string => joinUrl(getLocalizedBase(lang), 'heatmap');
export const getCollaborateUrl = (lang?: string): string => joinUrl(getLocalizedBase(lang), 'collaborate');
export const getOngoingStudiesUrl = (lang?: string): string => joinUrl(getLocalizedBase(lang), 'ongoing-studies');
export const getSiteUrl = (path = '', lang?: string): string => joinUrl(getLocalizedBase(lang), path);
export const getPaperSlug = (paperId: string): string => encodePaperId(paperId);
export const getPaperPermalink = (paperId: string): string =>
  joinUrl(SITE_BASE_URL, `paper/${getPaperSlug(paperId)}`);
