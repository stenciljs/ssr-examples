# SolidStart

SolidStart renders the page as one string (`mode: 'async'`), then a middleware passes the whole
document through Stencil's `renderToString()`. Solid then hydrates the page, and the Stencil
components hydrate alongside it.

```sh
pnpm build          # at the repo root, once
pnpm --filter @ssr-examples/example-solid-start dev       # http://localhost:3005
# or
pnpm --filter @ssr-examples/example-solid-start build && pnpm --filter @ssr-examples/example-solid-start start
BASE_URL=http://localhost:3005 pnpm test
```

## The integration

| File | What it does |
|---|---|
| [`src/middleware.ts`](src/middleware.ts) | h3 middleware: `renderToString()` on every HTML response |
| [`vite.config.ts`](vite.config.ts) | `solidStart({ middleware: './src/middleware.ts' })` registers it |
| [`src/entry-server.tsx`](src/entry-server.tsx) | `createHandler(..., { mode: 'async' })`, so the page arrives as one string instead of a stream |
| [`src/entry-client.tsx`](src/entry-client.tsx) | awaits `defineCustomElements()`, then `mount()` hydrates |
| [`src/routes/index.tsx`](src/routes/index.tsx) | the page: plain custom elements in Solid JSX |
| [`src/custom-elements.d.ts`](src/custom-elements.d.ts) | JSX types for the `demo-*` elements |
| [`src/routes/health.ts`](src/routes/health.ts) | `GET /health` API route |

### Server

```ts
// src/middleware.ts
export default createMiddleware([
  async (event, next) => {
    const body = await next();
    if (typeof body !== 'string' || !event.res.headers.get('content-type')?.includes('text/html')) return body;
    const { html } = await renderToString(body, { reuseWindow: true, ...ssrPropsOptions() });
    return html ?? body;
  },
]);
```

```tsx
// src/entry-server.tsx
export default createHandler(() => <StartServer document={...} />, { mode: 'async' });
```

SolidStart streams by default, and then `next()` gives you an h3 streaming response, not a string.
`renderToString()` needs the whole document, so `mode: 'async'` makes SolidStart wait for
everything (Suspense included) and hand back one HTML string. The middleware sees every
response, so it only touches strings with an HTML content type (`/health`, server functions and
assets pass through).

SolidStart v2 runs on Vite + Nitro + h3 v2 (no more Vinxi). The middleware is a plain array of
h3 middleware; `onRequest` / `onBeforeResponse` still work but are deprecated.

### Client

```tsx
// src/entry-client.tsx
defineCustomElements().then(() => mount(() => <StartClient />, document.getElementById('app')!));
```

**This must finish before Solid hydrates.** `defineCustomElements()` is async, so mount in its
`.then()`. Stencil's server render changes the light DOM of
`scoped` and unencapsulated components (`demo-badge`, `demo-notice`). Once the components are
defined, Stencil's [light DOM patches](https://stenciljs.com/docs/config/compat#lightdompatches)
make `firstChild`, `nextSibling` and `childNodes` report only the slotted content, so Solid sees
the DOM it rendered. If the components are defined after hydration, for example in `onMount`,
Solid walks into Stencil's nodes instead and fails:

```
Error: Hydration Mismatch. Unable to find DOM nodes for hydration key: 0000010010000000001
```

and the route's error boundary throws the server-rendered page away.

## Complex props

`demo-stats` takes an array property. In the template:

```tsx
<demo-stats stats={ssrProp(stats())} />
```

On the server, `ssrProp()` turns the array into a token string that Solid renders as an
attribute, and `ssrPropsOptions()` turns it back into the property before Stencil renders.
Stencil sends the value to the client in an `s-props` attribute and sets it before the component
first renders. (`s-props` is Stencil's `transferProps` render option, on by default. It's on a
local `@stencil/core` branch, linked with `pnpm link:core`, and not in a published release yet.)
On the client, `ssrProp()` returns the array unchanged, and Solid sets it as a property (it does that for any
attribute on a custom element), so later updates (`#add-stat`) work normally. See
[`packages/ssr-props`](../../packages/ssr-props).

Don't write `prop:stats`: Solid's server renderer drops `prop:` bindings, so the server HTML
gets no value and renders the empty state.

## Things to know

- **Events:** write `on:countChanged`. `onCountChanged` compiles to
  `addEventListener('countchanged')`, which never fires.
- **Attributes vs properties:** Solid sets every binding on a custom element as a property on
  the client, but as an attribute on the server, which is what `ssrProp()` relies on. Don't use
  `prop:` for complex props: Solid's server renderer drops it.
- **Text bindings in light-DOM components:** a sole child like `<demo-badge>{badge()}</demo-badge>`
  is skipped during hydration, and then updated through `textContent`, which Stencil patches.
  Leave `compat.lightDomPatches` on.
- **Mixed text gets markers.** `Last count: {x}` renders as `Last count: <!--$-->none<!--/-->`,
  so the paragraph binds one template string instead. Inside `demo-notice` the markers are fine:
  Solid finds them through Stencil's patched `firstChild` / `nextSibling`.
- **Lazy routes can hide ordering bugs.** `FileRoutes` loads each page asynchronously, so a page
  often hydrates after code that runs right after `mount()`. Don't rely on that: await
  `defineCustomElements()` before `mount()`.
