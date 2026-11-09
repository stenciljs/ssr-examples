# Astro

Server-rendering Stencil components in an Astro app.

```sh
pnpm install && pnpm build   # at the repo root, once
pnpm dev                     # in this folder: http://localhost:3003
```

## 1. Render the components on the server

Middleware sees every response. Astro streams the page, so read the whole body, pass it through
`renderToString()` and return a new `Response` ([`src/middleware.ts`](src/middleware.ts)):

```ts
import { defineMiddleware } from 'astro:middleware';
import { renderToString } from '@ssr-examples/components/ssr';

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (!response.headers.get('content-type')?.includes('text/html')) {
    return response;
  }
  const { html, diagnostics } = await renderToString(await response.text(), { reuseWindow: true });
  for (const d of diagnostics) console.warn('[stencil]', d.messageText);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
});
```

Set `output: 'server'` ([`astro.config.mjs`](astro.config.mjs)) so pages render on each request
and pass through the middleware; prerendered pages don't.

## 2. Load the components in the browser

Astro doesn't hydrate its templates, so a client script is enough
([`src/scripts/client.ts`](src/scripts/client.ts)):

```ts
import { defineCustomElements } from '@ssr-examples/components/loader';

defineCustomElements();
```

Include it from the page with `<script src="../scripts/client.ts"></script>`.

## 3. Use the components

Use them like any element ([`src/pages/index.astro`](src/pages/index.astro)):

```astro
---
import { ssrProp } from '@ssr-examples/components/ssr-prop';
---

<demo-counter start="5" step="2"></demo-counter>
<demo-stats stats={ssrProp(stats)}></demo-stats>
```

- **Objects and arrays:** wrap them in `ssrProp()`, so the server render gets the value, not a string.
  See [Passing objects and arrays](../../README.md#passing-objects-and-arrays).
- **Events and updates:** Astro templates only run on the server, so listen and set properties
  in the client script: `counter.addEventListener('countChanged', ...)`, `stats.stats = [...]`.
- **Islands:** if a framework island (`client:load`) renders Stencil components, define them
  before the island hydrates, as that framework's example shows.
