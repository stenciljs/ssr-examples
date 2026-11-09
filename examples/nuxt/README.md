# Nuxt

Nuxt renders the page, then a Nitro `render:response` hook passes the whole document through
Stencil's `renderToString()`. Vue then hydrates the page, and the Stencil components hydrate
alongside it.

```sh
pnpm build          # at the repo root, once
pnpm --filter @ssr-examples/example-nuxt dev       # http://localhost:3002
# or
pnpm --filter @ssr-examples/example-nuxt build && pnpm --filter @ssr-examples/example-nuxt start
BASE_URL=http://localhost:3002 pnpm test
```

## The integration

| File | What it does |
|---|---|
| [`server/plugins/stencil-ssr.ts`](server/plugins/stencil-ssr.ts) | `render:response` hook: `renderToString()` on every HTML response |
| [`app/plugins/stencil.client.ts`](app/plugins/stencil.client.ts) | awaits `defineCustomElements()` before Vue hydrates |
| [`nuxt.config.ts`](nuxt.config.ts) | `compilerOptions.isCustomElement`, so Vue doesn't try to resolve `demo-*` as Vue components |
| [`app/app.vue`](app/app.vue) | the page: plain custom elements in a Vue template |

### Server

```ts
// server/plugins/stencil-ssr.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', async (response) => {
    if (typeof response.body !== 'string' || !response.headers?.['content-type']?.includes('text/html')) {
      return;
    }
    const { html, diagnostics } = await renderToString(response.body, { reuseWindow: true });
    for (const d of diagnostics) console.warn('[stencil]', d.messageText);
    if (html) response.body = html;
  });
});
```

`render:response` gets the complete HTML string, so this is all the server needs. Nuxt's own
payload and state go through unchanged.

### Client

```ts
// app/plugins/stencil.client.ts
export default defineNuxtPlugin(async () => {
  await defineCustomElements();
});
```

**This must run before Vue hydrates**, which a `.client` plugin does. `defineCustomElements()` is
async, and Nuxt awaits async plugins before hydrating. Stencil's server render
changes the light DOM of `scoped` and unencapsulated components (`demo-badge`, `demo-notice`).
Once the components are defined, Stencil's [light DOM patches](https://stenciljs.com/docs/config/compat#lightdompatches)
make `textContent` and `childNodes` report only the slotted content, so Vue sees the DOM it
rendered. If the components are defined after hydration, for example in `onMounted` or an
`app:mounted` hook, Vue finds Stencil's extra nodes, reports a hydration mismatch, and replaces
the elements.

## Complex props

`demo-task-list` and `demo-stats` take array properties. In the template:

```vue
<demo-task-list :tasks="ssrProp(tasks)" />
<demo-stats :stats="ssrProp(stats)" />
```

`ssrProp()` comes from the component library (`@ssr-examples/components/ssr-prop`). On the
server it keeps the array in a registry and returns a reference that Vue renders as an
attribute, and Stencil's SSR runtime, in the same process, swaps the reference for the array
while it sets up the component. Each component then carries the value to the browser itself:
`@Prop({ serialize: 'json' })` writes it to the component's attribute on the server, and reads
it back before the component first renders. On the client, `ssrProp()` returns the array
unchanged, so Vue sets the property as usual, and later updates (`#add-stat`) work normally. If
an object prop is set on the server and the component has no serializer (`serialize: 'json'` or a `@PropSerialize()`),
`renderToString()` adds a warning to `diagnostics`, which the hook prints. (These need `@stencil/core` 5.0.0-beta.36 or later.) See
[Complex props](../../README.md#complex-props).

## Things to know

- **Events:** `@countChanged` works as written. For custom elements, Vue compiles it to
  `on:countChanged` and listens for the event with that exact case.
- **Text bindings in light-DOM components** (`<demo-badge>{{ badge }}</demo-badge>`): Vue
  compares and sets the element's `textContent` during hydration and updates, and Stencil's
  patched `textContent` makes that safe. Leave `compat.lightDomPatches` on.
- **Static subtrees hide problems.** Vue compiles static markup to HTML strings that hydrate
  without being compared. A page that passes may still fail once a slot gets a binding, so test
  with real bindings.
