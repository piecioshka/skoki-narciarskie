import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// GitHub Pages serves the site from a subdirectory, so the base path comes
// from the environment and stays empty for local development.
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://piecioshka.github.io',
  base: process.env.BASE_PATH || undefined,
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
