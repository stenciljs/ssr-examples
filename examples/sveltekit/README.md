# SvelteKit

SvelteKit renders the page, then the `handle` server hook passes the whole document through
Stencil's `renderToString()`. Svelte then hydrates the page, and the Stencil components hydrate
alongside it.

```sh
pnpm build          # at the repo root, once
pnpm --filter @ssr-examples/example-sveltekit dev       # http://localhost:3004
# or
pnpm --filter @ssr-examples/example-sveltekit build && pnpm --filter @ssr-examples/example-sveltekit start
BASE_URL=http://localhost:3004 pnpm test
```

## The integration

| File | What it does |
|---|---|
| [`src/hooks.server.ts`](src/hooks.server.ts) | `handle` hook: `renderToString()` on every HTML response |
| [`src/hooks.client.ts`](src/hooks.client.ts) | `init` hook: awaits `defineCustomElements()` before Svelte hydrates |
| [`src/routes/+page.svelte`](src/routes/+page.svelte) | the page: plain custom elements in a Svelte template |
| [`src/routes/health/+server.ts`](src/routes/health/+server.ts) | `GET /health` |
| [`vite.config.ts`](vite.config.ts) | `adapter-node`, so `start` runs a Node server (Kit 3 has no `svelte.config.js`) |

### Server

```ts
// src/hooks.server.ts
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  if (!response.headers.get('content-type')?.includes('text/html')) return response;
  const { html } = await renderToString(await response.text(), { reuseWindow: true, ...ssrPropsOptions() });
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
};
```

`resolve()` returns a `Response` whose body SvelteKit may stream (for example when a `load`
function returns promises). `await response.text()` buffers it into the complete document that
`renderToString()` needs. Don't use `transformPageChunk` for this: its chunks aren't guaranteed to
be whole documents, or even well-formed HTML. Kit 3 exports the hook types from
`@sveltejs/kit/hooks`, not `@sveltejs/kit`.

### Client

```ts
// src/hooks.client.ts
export const init: ClientInit = async () => {
  await defineCustomElements();
};
```

**This must finish before Svelte hydrates.** SvelteKit awaits `init` before hydrating, so return
or `await` the promise: `defineCustomElements()` is `async`. Svelte's hydration is stricter than
Vue's, and it needs the components defined for two reasons:

- Stencil's server render adds nodes to the light DOM of every component: an `<!--r.N-->` comment
  in every host, and the rendered template of `scoped` and unencapsulated components
  (`demo-badge`, `demo-notice`). When a component is defined, its client hydration removes the
  shadow components' comment. Svelte finds elements by counting siblings, so if the comment is
  still there it picks the wrong node and throws (`e.getAttribute is not a function`).
- Svelte sets static text like `<demo-badge>{badge}</demo-badge>` with `el.textContent = ...`
  during hydration. Once the component is defined, Stencil's patched `textContent` replaces only
  the slotted text. Before that, it wipes the server-rendered `<span class="badge">`.

## Complex props

`demo-stats` takes an array property. In the template:

```svelte
<demo-stats stats={ssrProp(stats)}></demo-stats>
```

On the server, `ssrProp()` turns the array into a token string that Svelte renders as an
attribute, and `ssrPropsOptions()` turns it back into the property before Stencil renders.
Stencil sends the value to the client in an `s-props` attribute and sets it before the component
first renders. That matters here: the components start rendering while SvelteKit loads the page's
modules, before Svelte sets any property. On the client, `ssrProp()` returns the array unchanged,
so Svelte then sets the property as usual, and later updates (`#add-stat`) work normally.
(`s-props` is Stencil's `transferProps` render option, on by default. It's on a local
`@stencil/core` branch, linked with `pnpm link:core`, and not in a published release yet.) See
[`packages/ssr-props`](../../packages/ssr-props).

## Things to know

- **Reactive text inside `scoped` or unencapsulated components doesn't hydrate.** The page binds
  `{framework}` and `{badge}` to `$state`, but since nothing reassigns them, Svelte compiles them
  as constants and sets `textContent` (see above). Make the value reactive (reassign it anywhere, or
  read it from `data` or props) and Svelte instead hydrates the text node by walking the host's
  children with `Node.prototype`'s native `firstChild` / `nextSibling` getters, which bypass
  Stencil's [light DOM patches](https://stenciljs.com/docs/config/compat#lightdompatches). It finds
  Stencil's `<!--r.N-->` comment and `<span class="badge">` instead of its text node, logs
  `hydration_mismatch`, and throws away and re-renders the whole page. There's no way to tell Svelte
  to skip hydrating an element's children. Keep reactive content out of light-DOM components'
  slots, or use `shadow` encapsulation for components that take reactive slot content: their
  slotted children are left as they were.
- **Custom element props are properties on the client.** Once an element is defined, Svelte sets
  any prop the element has a setter for as a property, never an attribute. On the server it can
  only write attributes, which is the gap `ssrProp()` covers.
- **Events:** `oncountChanged` works as written. Svelte 5 event attributes are case-sensitive and
  listen for the name after `on`, here `countChanged`.
- **A hydration mismatch replaces the whole page**, not one element, and the conformance suite
  only catches it through the `hydration_mismatch` warning: by the time Svelte removes the tree,
  Stencil has already removed the `s-id` attributes the "hydrated in place" check looks for.
