import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://brickfielder.github.io',
  base: '/codex-experiments/',   // <-- repo name with leading & trailing slash
  integrations: [tailwind(), preact()],
  output: 'static',
  experimental: { contentLayer: false }
});
