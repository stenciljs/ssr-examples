import type { Config } from '@stencil/core';
import { angularOutputTarget } from '@stencil/angular-output-target';
import { reactOutputTarget } from '@stencil/react-output-target';
import { vueOutputTarget } from '@stencil/vue-output-target';
import { typesOutputTarget } from '@stencil/types-output-target';

export const config: Config = {
  namespace: 'demo-components',
  generateExportMaps: true,
  outputTargets: [
    // Client: lazy-loaded bundle. Frameworks call `defineCustomElements()` from `./loader`.
    { type: 'loader-bundle' },
    // Client: one module per component (`./<tag>`). The React wrappers import these.
    { type: 'standalone' },
    // Server: `renderToString()` as `./ssr`, and `ssrProp()` for templates as `./ssr-prop`.
    { type: 'ssr' },
    // JSX / template types for using the components as plain custom elements in each framework
    typesOutputTarget({
      reactTypesPath: 'dist/types',
      vueTypesPath: 'dist/types',
      svelteTypesPath: 'dist/types',
      solidTypesPath: 'dist/types',
      astroTypesPath: 'dist/types',
    }),
    // React wrappers, with server versions for Next.js (`hydrateModule`).
    reactOutputTarget({
      outDir: '../components-react/src',
      hydrateModule: '@ssr-examples/components/ssr',
      clientModule: '@ssr-examples/components-react',
    }),
    // Vue wrappers: each defines its element on import and proxies its props and events
    vueOutputTarget({
      componentCorePackage: '@ssr-examples/components',
      proxiesFile: '../components-vue/src/components.ts',
      includeImportCustomElements: true,
      // when server rendering, wrappers write their props as attributes for `renderToString()`
      ssrPropModule: '@ssr-examples/components/ssr-prop',
    }),
    // Angular wrappers: standalone components that define their element and proxy its props and events
    angularOutputTarget({
      componentCorePackage: '@ssr-examples/components',
      directivesProxyFile: '../components-angular/src/components.ts',
      outputType: 'standalone',
      // with Angular SSR, wrappers write their inputs as attributes for `renderToString()`
      ssrPropModule: '@ssr-examples/components/ssr-prop',
    }),
  ],
};
