// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  // Render on every request, so the middleware sees each page (no prerendering)
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { port: 3003 },
});
