import { defineConfig } from 'vite';
import { nitro } from 'nitro/vite';
import { solidStart } from '@solidjs/start/config';

export default defineConfig({
  plugins: [
    // the middleware passes every HTML response through Stencil's renderToString()
    solidStart({ middleware: './src/middleware.ts' }),
    nitro(),
  ],
});
