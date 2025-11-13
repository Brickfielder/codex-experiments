import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwind from '@astrojs/tailwind';

const repository = process.env.GITHUB_REPOSITORY?.split('/') ?? [];
const [owner, repoName] = repository;

const rawBase = process.env.ASTRO_BASE ?? (repoName ? `/${repoName}` : '/');
const normalizedBase =
  rawBase === '/' ? '/' : `/${rawBase.replace(/^\/+/, '').replace(/\/+$/, '')}`;

const site =
  process.env.ASTRO_SITE ??
  (owner && repoName
    ? `https://${owner}.github.io${normalizedBase === '/' ? '' : normalizedBase}`
    : 'http://localhost:3000');

export default defineConfig({
  site,
  base: normalizedBase,
  integrations: [tailwind(), preact()],
  output: 'static',
  experimental: {
    contentLayer: false
  }
});
