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

`demo-task-list` and `demo-stats` take array properties. In the template:

```astro
<demo-task-list tasks={ssrProp(tasks)}></demo-task-list>
<demo-stats stats={ssrProp(stats)}></demo-stats>
```

`ssrProp()` comes from the component library (`@ssr-examples/components/ssr-prop`). The
frontmatter only runs on the server, so it always keeps the array in a registry and returns a
reference, which Astro renders as an escaped attribute. Stencil's SSR runtime, in the same
process, swaps the reference for the array while it sets up the component. Each component then
carries the value to the browser itself: `@Prop({ serialize: 'json' })` writes it to the component's attribute on the server, and reads it back before the component first renders, so
both components hydrate with it. If an object prop is set on the server and the component has no serializer (`serialize: 'json'` or a `@PropSerialize()`), `renderToString()` adds a warning to `diagnostics`, which the middleware
prints. (These need `@stencil/core` 5.0.0-beta.36 or later.)
After that, the client script owns the value: `#add-stat` sets
`stats.stats = [...stats.stats, extraStat]`. See [Complex props](../../README.md#complex-props).

## Things to know

- **Use `output: 'server'`.** Middleware runs on every request only when the page is rendered on
  demand. The Node adapter's `standalone` mode builds `dist/server/entry.mjs`, a server you can
  start on its own, which `pnpm start` runs with `PORT=3003`.
- **Don't edit the response in place.** Middleware gets a streaming `Response`. Read it with
  `await response.text()`, return a new `Response`, and drop `content-length` if it's set.
  Skip anything that isn't `text/html`; the same middleware also runs for `/health`.
- **No framework hydration, no framework state on the client.** The notice and badge text are
  bound in the template (`{framework}`, `{badge}`), but only on the server. The client script
  reads what it needs from the DOM (`demo-stats`'s `stats` property, read back from its attribute).
  If you add an island (`client:load`) that renders Stencil components, it hydrates like that
  framework does, and the components must be defined before the island hydrates.
- **Global styles.** The page's `<style>` is `is:global`. A scoped Astro style adds a
  `data-astro-cid-*` attribute to every element in the template, Stencil hosts included, and
  this page doesn't need that.
- **`astro dev` under an AI agent.** Astro 7 detects coding agents and starts `astro dev` in the
  background, returning at once with JSON logs; manage it with `astro dev stop` and
  `astro dev logs`. Pass `--ignore-lock` to keep it in the foreground. In a normal terminal it
  runs in the foreground as usual.
