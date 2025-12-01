import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

const rawBase = process.env.ASTRO_BASE ?? '/';
const normalizedBase =
  rawBase === '/' ? '/' : `/${rawBase.replace(/^\/+/, '').replace(/\/+$/, '')}`;

const DEFAULT_SITE = 'https://caresearchhub.org';

const site =
  process.env.ASTRO_SITE ??
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : DEFAULT_SITE);

export default defineConfig({
  site,
  base: normalizedBase,
  integrations: [
    tailwind(),
    preact({
      exclude: ['src/components/CountryHeatmap.tsx']
    }),
    react({
      include: ['src/components/CountryHeatmap.tsx']
    })
  ],
  output: 'static',
  experimental: {
    contentLayer: false
  }
});
