# Next.js

Next.js (App Router) is the exception to "pass the whole page through `renderToString()`".
React Server Components and Next's streaming renderer produce the page in pieces, so there's no
single document to post-process. Instead, the [React output target](https://stenciljs.com/docs/react#server-side-rendering)
generates **server versions of the React wrappers**: during Next's server render, each wrapper
renders its own Stencil component with the library's `ssr` module and returns the result as
React elements.

```sh
pnpm build          # at the repo root, once
pnpm --filter @ssr-examples/example-next dev       # http://localhost:3001
# or
pnpm --filter @ssr-examples/example-next build && pnpm --filter @ssr-examples/example-next start
BASE_URL=http://localhost:3001 pnpm test
```

## The integration

There's no hook to write. It's all in the component library's build:

| File | What it does |
|---|---|
| [`packages/components/stencil.config.ts`](../../packages/components/stencil.config.ts) | `reactOutputTarget({ hydrateModule, clientModule })` generates `components.ts` (client) and `components.server.ts` (server) wrappers |
| [`packages/components-react/package.json`](../../packages/components-react/package.json) | exposes the server wrappers as `@ssr-examples/components-react/next` |
| [`app/demo.tsx`](app/demo.tsx) | the page, using the wrappers from `/next` |

```ts
// stencil.config.ts
reactOutputTarget({
  outDir: '../components-react/src',
  hydrateModule: '@ssr-examples/components/ssr',
  clientModule: '@ssr-examples/components-react',
}),
```

```tsx
// app/demo.tsx
'use client';
import { DemoCard, DemoStats } from '@ssr-examples/components-react/next';

<DemoCard heading="Server-rendered card" variant="highlight">…</DemoCard>
<DemoStats stats={stats} />
```

On the client, the same import resolves to the normal wrappers, which define each component
from the library's `standalone` build as soon as the wrapper module loads, before React hydrates.

## Complex props

Nothing extra. The server wrappers set object and array props as properties before Stencil
renders. Stencil then sends them to the client in an `s-props` attribute (its `transferProps`
render option, on by default) and sets them before the component first renders. Without that,
`demo-stats` would render empty on the client until the wrapper set the property after
hydrating. (`transferProps` is on a local `@stencil/core` branch, linked with `pnpm link:core`,
and not in a published release yet.)

## Things to know

- **Each component renders separately.** Every wrapper makes its own `renderToString()` call,
  with `reuseWindow: true` so the SSR runtime is set up once, not per component. Nested Stencil
  components in a wrapper's children are serialized as plain tags and render themselves.
- **React output target fixes this example needs**, on a local `@stencil/react-output-target`
  branch installed with `pnpm link:react`:
  - attribute values weren't escaped, so a string prop containing `"` broke the markup;
  - with Stencil v5, a shadow component with a scoped component slotted into it was emitted
    twice: v5 puts the scoped component's styles at the start of each fragment, and the wrapper
    found the component by line number in pretty-printed output;
  - light DOM components lost meaningful whitespace for the same reason: `demo-notice` rendered
    `Note:Rendered by …`, and on the client Stencil's hydration then took the slotted text for
    the missing space and overwrote it. The wrapper now reads the unformatted output, and Stencil
    no longer takes another node's text when an annotated one is missing.
- **Text next to dynamic values:** `Last count: {n}` renders as `Last count: <!-- -->5`, React's
  separator between adjacent text. That's harmless in the browser, but use one template literal
  where you want a single text node, as in light-DOM components.
- **Styles** for scoped components are hoisted into React's own `<style data-precedence="stencil">`
  in `<head>`, not Stencil's `<style sty-id>`. The client adds its own copy when the
  component loads, which does no harm.
