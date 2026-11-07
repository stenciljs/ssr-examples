# Stencil `ssr` examples

Server-side rendering [Stencil](https://stenciljs.com) components inside JavaScript frameworks.

Stencil v5's [`ssr` output target](https://stenciljs.com/docs/ssr) builds a module that takes HTML
and renders every Stencil component in it, as Declarative Shadow DOM, scoped styles and
hydration markup. This repo has one component library and the same page built in each of the
popular frameworks, plus a conformance suite that checks they all render and hydrate
correctly.

| Example | Framework | How Stencil renders | Port |
|---|---|---|---|
| [`examples/node`](examples/node) | none (`node:http`) | `renderToString()` on the page | 3000 |
| [`examples/next`](examples/next) | Next.js 16 (App Router) | the React output target's server wrappers, per component | 3001 |
| [`examples/nuxt`](examples/nuxt) | Nuxt 4 | Nitro `render:response` hook | 3002 |
| [`examples/astro`](examples/astro) | Astro 7 | `onRequest` middleware | 3003 |
| [`examples/sveltekit`](examples/sveltekit) | SvelteKit 3 / Svelte 5 | `handle` hook | 3004 |
| [`examples/solid-start`](examples/solid-start) | SolidStart 2 | h3 middleware, `async` render mode | 3005 |
| [`examples/react-router`](examples/react-router) | React Router 8 (framework mode, ex-Remix) | `entry.server.tsx`, after `onAllReady` | 3006 |
| [`examples/angular`](examples/angular) | Angular 22 (`@angular/ssr`) | `server.ts`, on `AngularNodeAppEngine`'s response | 3007 |

## The pattern

For every framework except Next.js, the integration is two small pieces.

**1. Server:** find the one place that sees the finished HTML document, and pass it through
`renderToString()`:

```ts
import { renderToString } from 'my-components/ssr';

const { html } = await renderToString(pageHtml, { reuseWindow: true });
```

`renderToString()` needs the whole document, so streamed responses are buffered first. Each
example's README shows its framework's hook.

**2. Client:** define the components **before the framework hydrates**, and wait for it, since
`defineCustomElements()` is async:

```ts
import { defineCustomElements } from 'my-components/loader';

await defineCustomElements();
// ...then let the framework hydrate
```

Stencil's server render changes the light DOM of `scoped` and unencapsulated components: their
own markup goes in next to the framework's slotted content. Once the components are defined,
Stencil's [light DOM patches](https://stenciljs.com/docs/config/compat#lightdompatches) make
`firstChild`, `childNodes`, `textContent` and friends report only the slotted content. The
framework then finds the DOM it rendered. If the framework hydrates first, every one of them
reports a mismatch, and most throw the server markup away: Vue and React re-render, Solid's
error boundary drops the page, Angular fails with `NG0500`.

**Next.js** has no single document to post-process. The React output target generates server
versions of the React wrappers instead, and each renders its own component during Next's server
render. See [`examples/next`](examples/next).

## Complex props

HTML can only carry strings, so an array or object bound in a template doesn't reach a
server-rendered component: frameworks drop it or render `"[object Object]"`. The examples wrap
complex values in `ssrProp()` ([`packages/ssr-props`](packages/ssr-props)):

```vue
<demo-stats :stats="ssrProp(stats)" />
```

On the server it's a token attribute that `ssrPropsOptions()` turns back into the property
before Stencil renders. On the client it's the value itself, so the framework sets the property
as usual.

```ts
const { html } = await renderToString(page, { reuseWindow: true, ...ssrPropsOptions() });
```

The client half is a proposed Stencil core feature, the `transferProps` render option (on by
default). At the end of the server render, complex props that were set on a host from outside,
and have no attribute, are written to an `s-props` attribute. The client sets them before the
component's first render, so it hydrates with the same data, with no flash of an empty state.
It needs no `ssrProp()` for values set in `beforeSsr` or by the React output target's wrappers,
so Next.js gets it with no extra code.

## Running it

Requirements: Node 22+ (SolidStart wants 24), pnpm 9.

```sh
pnpm install
pnpm build                      # packages/*: components, React wrappers, ssr-props
scripts/test-all.sh             # build + start + test every example (production servers)
DEV=1 scripts/test-all.sh nuxt  # one example, against its dev server

# or by hand
pnpm --filter @ssr-examples/example-nuxt dev
BASE_URL=http://localhost:3002 pnpm test
```

### Local Stencil checkouts

Several examples depend on fixes that aren't released yet. The root `package.json` points the
workspace at local checkouts through pnpm overrides:

```sh
pnpm link:core     # @stencil/core <- ../../stenciljs/packages/core (or $STENCIL_CORE_PATH)
pnpm link:react    # @stencil/react-output-target <- packed from ../../output-targets/packages/react
pnpm unlink:core && pnpm unlink:react
```

Build the linked package, then `pnpm build` here. `link:react` installs a packed copy, because
Turbopack won't resolve a symlink outside the project, so re-run it after rebuilding the output
target.

## Layout

```
packages/components/        the Stencil library: loader-bundle, standalone, ssr, React wrappers
packages/components-react/  generated React wrappers (Next.js imports `/next`)
packages/ssr-props/         ssrProp() + ssrPropsOptions(): complex props from templates
packages/demo-data/         the data every page renders
examples/<framework>/       one app per framework, each with a README
tests/conformance/          the suite every example passes (CONTRACT.md)
```

### Components

| Tag | Encapsulation | Shows |
|---|---|---|
| `demo-card` | shadow | named and default slots, `::part`, a reflected prop |
| `demo-badge` | scoped | scoped CSS, slotted framework text, inside light and shadow DOM |
| `demo-notice` | none | light DOM styled by the page, slotted framework text next to its own |
| `demo-counter` | shadow | `@State`, an event the framework listens to |
| `demo-task-list` | shadow | an array prop, nested components |
| `demo-stats` | shadow | an array prop updated by the framework |

## Conformance tests

[`tests/conformance`](tests/conformance) checks each example from the outside
([`CONTRACT.md`](CONTRACT.md) describes the page):

- **Server HTML:** every component is rendered, with Declarative Shadow DOM and scoped styles;
  complex props reach the server render, `<`, `&` and quotes included; hydration IDs are unique; concurrent requests all render.
- **JavaScript off:** the page is complete and styled from the HTML alone.
- **JavaScript on:**
  - nothing logs an error or a hydration warning;
  - Stencil hydrates every component, and the framework hydrates in place, rather than
    replacing the server's elements;
  - nothing is duplicated, and `demo-stats` never renders empty;
  - both the components and the framework's own state still work (events, property updates).

## Found along the way

Stencil core fixes (local branch `fix/ssr-framework-integration` in `stenciljs`):

- A standalone `defineCustomElement()` threw `customElements is not defined` on the server,
  which broke every Next.js build.
- Shadow hosts no longer get a `<!--r.N-->` comment in their light DOM, which frameworks counting
  child nodes tripped over.
- **The patched `textContent` setter parsed its value as HTML** (an injection risk on scoped and
  unencapsulated components). Its getter also included comment text, such as React's
  `<!-- -->` and Solid's `<!--$-->`.
- Client hydration could take a framework's slotted text for a missing text node of the
  component's own, and overwrite it.
- The `ssr` output's `.d.ts` imported `rolldown`, `typescript` and `@stencil/core/app-data`.
- New: the `transferProps` render option (above).

React output target fixes (branch `fix/react-ssr-v5-fragments` in `output-targets`):
attribute escaping, and reading v5 fragments structurally instead of by line number, which
fixed duplicated components and lost whitespace.

Framework notes worth knowing before you start are in each example's README. The main ones:

- **Svelte 5** hydrates with the native `firstChild`/`nextSibling` getters, bypassing Stencil's
  light DOM patches. Reactive text slotted into a `scoped` or unencapsulated component can't
  hydrate there, so use `shadow` for components that take framework-reactive slot content.
- **React 19** doesn't set properties or attach event listeners on custom elements it hydrates,
  only on later updates. The React Router example uses a ref for events; `s-props` covers props.
- **Angular**'s server DOM sets `[prop]` bindings as properties, which never reach the HTML. Use
  `[attr.x]` for anything Stencil should see on the server.
