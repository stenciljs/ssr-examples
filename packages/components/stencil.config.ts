import type { Config } from '@stencil/core';
import { reactOutputTarget } from '@stencil/react-output-target';

export const config: Config = {
  namespace: 'demo-components',
  generateExportMaps: true,
  outputTargets: [
    // Client: lazy-loaded bundle. Frameworks call `defineCustomElements()` from `./loader`.
    { type: 'loader-bundle' },
    // Client: one module per component (`./<tag>`). The React wrappers import these.
    { type: 'standalone' },
    // Server: `renderToString()` and friends, exposed as `./ssr`.
    { type: 'ssr' },
    { type: 'types' },
    // React wrappers, with server versions for Next.js (`hydrateModule`).
    reactOutputTarget({
      outDir: '../components-react/src',
      hydrateModule: '@ssr-examples/components/ssr',
      clientModule: '@ssr-examples/components-react',
    }),
  ],
};
