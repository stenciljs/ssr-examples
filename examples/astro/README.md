# Astro

Astro renders the page on the server (Node adapter, standalone mode), then a middleware reads the
whole response and passes it through Stencil's `renderToString()`. Astro doesn't hydrate its own
templates, so a plain client `<script>` loads the Stencil components and handles the page's few
interactive bits.

```sh
pnpm build          # at the repo root, once
pnpm --filter @ssr-examples/example-astro dev       # http://localhost:3003
# or
pnpm --filter @ssr-examples/example-astro build && pnpm --filter @ssr-examples/example-astro start
BASE_URL=http://localhost:3003 pnpm test
```

## The integration

| File | What it does |
|---|---|
| [`src/middleware.ts`](src/middleware.ts) | `onRequest` middleware: buffers every HTML response and runs `renderToString()` on it |
| [`src/scripts/client.ts`](src/scripts/client.ts) | `defineCustomElements()`, then the page's event handlers |
| [`astro.config.mjs`](astro.config.mjs) | `output: 'server'` with `@astrojs/node` in `standalone` mode |
| [`src/pages/index.astro`](src/pages/index.astro) | the page: plain custom elements in an Astro template |
| [`src/pages/health.ts`](src/pages/health.ts) | `GET /health` |

### Server

```ts
// src/middleware.ts
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (!response.headers.get('content-type')?.includes('text/html')) return response;
  const { html } = await renderToString(await response.text(), { reuseWindow: true, ...ssrPropsOptions() });
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
});
```

Astro streams pages, and `next()` gives you a `Response` whose body is still streaming.
`renderToString()` needs the whole document, so `await response.text()` reads all of it first.
Then the middleware returns a new `Response` with the rendered HTML. A `Response` body can only
be read once, so you can't change the old one in place.

### Client

```astro
<!-- src/pages/index.astro -->
<script src="../scripts/client.ts"></script>
```

```ts
// src/scripts/client.ts
defineCustomElements();

document.querySelector('demo-counter')!.addEventListener('countChanged', (e) => { /* #last-count */ });
document.querySelector('#add-stat')!.addEventListener('click', () => { /* stats.stats = [...] */ });
```

Astro bundles a `<script>` and outputs it as `type="module"`, so it runs after the document has
been parsed and nothing else needs to wait for. Astro doesn't hydrate the page, so the problem
other frameworks have here (they must define the components, and await it, before they hydrate)
doesn't come up, and nothing needs to await `defineCustomElements()`.

## Complex props

`demo-stats` takes an array property. In the template:

```astro
<demo-stats stats={ssrProp(stats)}></demo-stats>
```

The frontmatter only runs on the server, so `ssrProp()` always returns its token string, which
Astro renders as an escaped attribute. `ssrPropsOptions()` turns it back into the property before
Stencil renders. Stencil sends the value to the client in an `s-props` attribute and sets it
before the component first renders, so `demo-stats` hydrates with it. (`s-props` is Stencil's
`transferProps` render option, on by default. It's on a local `@stencil/core` branch, linked with
`pnpm link:core`, and not in a published release yet.) After that, the client script owns the
value: `#add-stat` sets `stats.stats = [...stats.stats, extraStat]`. See
[`packages/ssr-props`](../../packages/ssr-props).

## Things to know

- **Use `output: 'server'`.** Middleware runs on every request only when the page is rendered on
  demand. The Node adapter's `standalone` mode builds `dist/server/entry.mjs`, a server you can
  start on its own, which `pnpm start` runs with `PORT=3003`.
- **Don't edit the response in place.** Middleware gets a streaming `Response`. Read it with
  `await response.text()`, return a new `Response`, and drop `content-length` if it's set.
  Skip anything that isn't `text/html`; the same middleware also runs for `/health`.
- **No framework hydration, no framework state on the client.** The notice and badge text are
  bound in the template (`{framework}`, `{badge}`), but only on the server. The client script
  reads what it needs from the DOM (`demo-stats`'s `stats` property, set from `s-props`).
  If you add an island (`client:load`) that renders Stencil components, it hydrates like that
  framework does, and the components must be defined before the island hydrates.
- **Global styles.** The page's `<style>` is `is:global`. A scoped Astro style adds a
  `data-astro-cid-*` attribute to every element in the template, Stencil hosts included, and
  this page doesn't need that.
- **`astro dev` under an AI agent.** Astro 7 detects coding agents and starts `astro dev` in the
  background, returning at once with JSON logs; manage it with `astro dev stop` and
  `astro dev logs`. Pass `--ignore-lock` to keep it in the foreground. In a normal terminal it
  runs in the foreground as usual.
