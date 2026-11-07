# React Router

React Router (framework mode) renders the page with React's streaming renderer. `entry.server.tsx`
waits for the whole document, collects it into a string and passes it through Stencil's
`renderToString()`. React then hydrates the document, and the Stencil components hydrate
alongside it.

```sh
pnpm build          # at the repo root, once
pnpm --filter @ssr-examples/example-react-router dev       # http://localhost:3006
# or
pnpm --filter @ssr-examples/example-react-router build && pnpm --filter @ssr-examples/example-react-router start
BASE_URL=http://localhost:3006 pnpm test
```

## The integration

| File | What it does |
|---|---|
| [`app/entry.server.tsx`](app/entry.server.tsx) | Buffers React's stream (`onAllReady`) and runs `renderToString()` on the full document |
| [`app/entry.client.tsx`](app/entry.client.tsx) | Awaits `defineCustomElements()`, then `hydrateRoot()` |
| [`app/routes/home.tsx`](app/routes/home.tsx) | The page: plain custom elements in JSX |
| [`app/root.tsx`](app/root.tsx) | The document: page CSS as a `<link>` and `suppressHydrationWarning` on `<html>` |
| [`app/custom-elements.d.ts`](app/custom-elements.d.ts) | JSX types for the `demo-*` tags |
| [`app/routes/health.ts`](app/routes/health.ts) | `GET /health` resource route |

`entry.server.tsx` and `entry.client.tsx` are optional in React Router. To get the defaults to start
from, run `npx react-router reveal`.

### Server

```tsx
// app/entry.server.tsx
const { pipe, abort } = renderToPipeableStream(<ServerRouter context={routerContext} url={request.url} />, {
  onAllReady() {
    const chunks: Buffer[] = [];
    const body = new PassThrough();
    body.on('data', (chunk) => chunks.push(chunk));
    body.on('end', async () => {
      const { html } = await renderToString(Buffer.concat(chunks).toString('utf8'), {
        reuseWindow: true,
        ...ssrPropsOptions(),
      });
      responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
      resolve(new Response(html, { headers: responseHeaders, status: responseStatusCode }));
    });
    pipe(body);
  },
  // ...
});
```

`handleRequest` is the one place that sees the whole document, but React streams it. Stencil
needs the complete HTML, so this example waits for `onAllReady` instead of the default
`onShellReady` (which the default entry only uses for bots), then buffers everything before
sending. React Router's own scripts and the `<!--$-->` Suspense markers go through unchanged.

### Client

```tsx
// app/entry.client.tsx
defineCustomElements().then(() => {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    );
  });
});
```

**The components must be defined before React hydrates.** Stencil's server render changes the
light DOM of `scoped` and unencapsulated components (`demo-badge`, `demo-notice`). Once the
components are defined, Stencil's [light DOM patches](https://stenciljs.com/docs/config/compat#lightdompatches)
make `firstChild`, `childNodes` and `textContent` report only the slotted content. React hydrates
the whole `document` by walking `firstChild` and `nextSibling`, so it sees the nodes it rendered.
Without the patches, React finds `demo-notice`'s `<strong>` where it expects the text
`Rendered by `. It throws a hydration error and re-renders the entire document on the client.

`defineCustomElements()` defines the elements asynchronously (after a microtask), so wait for it
before calling `hydrateRoot()`.

## Complex props

`demo-stats` takes an array property. In JSX:

```tsx
<demo-stats suppressHydrationWarning stats={ssrProp(stats)} />
```

On the server, `ssrProp()` returns a token string, which React renders as an attribute.
`ssrPropsOptions()` turns it back into the property before Stencil renders, and Stencil sends the
value to the client in an `s-props` attribute, which it sets before the component first renders.
(`s-props` is Stencil's `transferProps` render option, on by default. It's on a local
`@stencil/core` branch, linked with `pnpm link:core`, and not in a published release yet.) On the
client, `ssrProp()` returns the array. React 19 sets the array as a property on elements it
creates or updates, but **not on elements it hydrates**, so `s-props` is what gives `demo-stats`
its data on the first render. Later updates (`#add-stat`) go through React normally. See
[`packages/ssr-props`](../../packages/ssr-props).

## Things to know

- **Events: React doesn't attach custom element listeners when it hydrates.** React 19 adds an
  `on*` prop's listener only when it creates or updates a custom element. On a hydrated element,
  `oncountChanged={...}` does nothing until something re-renders the element with a new function.
  This example listens from a ref callback instead (React 19 ref callbacks can return a cleanup):
  ```tsx
  const counterRef = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const onCountChanged = (e: Event) => setLastCount((e as CustomEvent<number>).detail);
    el.addEventListener('countChanged', onCountChanged);
    return () => el.removeEventListener('countChanged', onCountChanged);
  }, []);
  ```
  When React does attach a listener, the event name is everything after `on`, case and all:
  `oncountChanged` listens for `countChanged`, and `onCountChanged` for `CountChanged`.
- **Dev builds report attribute mismatches; production builds don't check.** The server render
  adds attributes React didn't render: `s-id`, `class="hydrated"`, and the host's own `class` or
  `role`. Stencil also adds `data-stencil-build` and `class="hydrated"` to `<html>`. React's
  development build compares attributes during hydration and logs an error for these.
  `suppressHydrationWarning` on each Stencil host, and on `<html>`, silences it. The production
  build skips the comparison, so a page can pass under `build` + `start` and fail under `dev`.
  Test both. The prop also turns off React's text check for that element (a host with a single
  text child, like `demo-badge`).
- **Don't put a plain `<style>` in `<head>`.** In `<head>`, React hydrates its `<style>` against
  the first `<style>` it finds without `data-precedence`. Stencil puts styles there on the server
  (scoped component styles) and in the browser (its `visibility: hidden` rule), so React picks up
  one of Stencil's. Use a stylesheet `<link>` (here, the route's `links` export) or React 19's
  `<style href precedence>`.
- **React separates adjacent text with `<!-- -->`.** `Last count: {lastCount ?? 'none'}` is
  server-rendered as `Last count: <!-- -->none`. Write it as one string
  (`` {`Last count: ${...}`} ``) when the text matters, as it does for `#last-count`. Inside light
  DOM components, Stencil keeps the separators as slotted nodes: `demo-notice` ends up with
  `Rendered by <!-- -->React Router<!-- -->.`, which hydrates fine.
- **No streaming.** Buffering means the first byte waits for the whole page, including any
  `<Await>`/Suspense data. That is the cost of a whole-document `renderToString()`.
- **Use plain custom elements, not React wrappers.** React 19 renders custom elements directly:
  string props become attributes on the server, and object or function props are left out. This
  is why complex props need `ssrProp()`.
