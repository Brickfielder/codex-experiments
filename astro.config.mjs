import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind(), preact()],
  output: 'static',
  experimental: {
    contentLayer: false
  }
});
