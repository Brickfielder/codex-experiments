const REPO_BASE_URL = 'https://github.com/Brickfielder/codex-experiments';
const SITE_BASE_URL = 'https://brickfielder.github.io/codex-experiments';

const ensureTrailingSlash = (value: string): string => (value.endsWith('/') ? value : `${value}/`);

const joinUrl = (base: string, path = ''): string => {
  const normalizedBase = ensureTrailingSlash(base);
  const normalizedPath = path.replace(/^\/+/, '');
  return normalizedPath ? `${normalizedBase}${normalizedPath}` : normalizedBase;
};

export const repoBaseUrl = REPO_BASE_URL;
export const siteBaseUrl = SITE_BASE_URL;

export const getBrowseUrl = (): string => joinUrl(REPO_BASE_URL, 'browse');
export const getAboutUrl = (): string => joinUrl(REPO_BASE_URL, 'about');
export const getSiteUrl = (path = ''): string => joinUrl(SITE_BASE_URL, path);
export const getPaperPermalink = (paperId: string): string => joinUrl(SITE_BASE_URL, `paper/${paperId}`);
