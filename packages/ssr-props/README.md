# `@ssr-examples/ssr-props`

Pass complex props (objects, arrays) to server-rendered Stencil components from any framework's
templates, without writing a deserializer for each one.

## The problem

When a framework renders the page and Stencil's `renderToString()` renders the components
afterwards, the only thing that reaches Stencil is HTML. Props are attributes, which are strings.
An array bound in a template is dropped (React, Solid), or rendered as `"[object Object]"`
(Vue, Svelte, Astro). Stencil then renders the component without it.

Without this package, you'd set the property by hand in `renderToString()`'s `beforeSsr`. That's
fine for one component, but the hook then has to know every component's data.

## How it works

```vue
<demo-stats :stats="ssrProp(stats)" />
```

```ts
const { html } = await renderToString(page, { ...ssrPropsOptions() });
```

1. **Template (server):** `ssrProp(value)` returns a token string carrying `value` as JSON. The
   framework renders it as an ordinary attribute, escaped like any other.
2. **`renderToString()`:** `ssrPropsOptions()`'s `beforeSsr` finds the token attributes, removes
   them, and sets the parsed values as properties. Stencil renders with them.
3. **Stencil → client:** Stencil writes complex props that were set from outside, with no
   attribute, to an `s-props` attribute on the host. The client sets them on the element
   before the component first renders, so it hydrates with the same data and there's no flash
   of empty content.
4. **Template (client):** `ssrProp(value)` returns `value` unchanged. The framework sets the
   property as it normally would, and later updates work as usual.

Step 3 is Stencil's `transferProps` render option, which is on by default. It isn't in a
published release yet: this workspace links a local `@stencil/core` that has it (`pnpm link:core`).

It also covers values you set yourself in `beforeSsr`, and props a framework wrapper sets during
SSR, such as the React output target's Next.js wrappers. Those need no `ssrProp()` at all.

## API

| Export | Use |
|---|---|
| `ssrProp(value)` from `@ssr-examples/ssr-props` | In templates. Isomorphic. |
| `ssrPropsOptions(chain?)` from `@ssr-examples/ssr-props/server` | Spread into `renderToString()` options. Pass your own `beforeSsr` as `chain.beforeSsr`. |
| `resolveSsrProps(doc)` from `@ssr-examples/ssr-props/server` | The `beforeSsr` itself, to call from your own. |

## Limits

- **Values must survive `JSON.stringify()`:** plain objects, arrays and primitives. A `Map`,
  `Date` or class instance won't round-trip.
- **Multi-word prop names.** On the server the token arrives as an attribute, and HTML lower-cases
  attribute names: `chartData` arrives as `chartdata`, which `resolveSsrProps()` can't map back
  (`chart-data` maps to `chartData`). Single-word props, like the ones here, have no such problem.
  Core could resolve this properly, since it knows each component's attribute names: see the
  repo README.
- **The data is in the page twice:** once as the framework's own state (Nuxt's payload,
  React's flight data) and once in `s-props`. The same as with any SSR prop that has to survive
  to the client.
