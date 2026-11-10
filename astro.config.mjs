// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://crowgamer.com',
  integrations: [react(), sitemap()],
  // Default is `_astro`; underscore-prefixed directories are awkward on some hosts.
  build: { assets: 'assets' },
});
