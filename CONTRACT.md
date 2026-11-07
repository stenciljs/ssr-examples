# Example contract

Every example in `examples/` serves the **same page** with the **same content**, built with that
framework's own templating, so one conformance suite (`tests/conformance`) can check them all. If
you add an example, implement everything below, then run:

```sh
BASE_URL=http://localhost:<port> pnpm test
```

## Inputs

All examples depend on the workspace packages:

| Package | Use |
|---|---|
| `@ssr-examples/components` | `./ssr` on the server (`renderToString`), `./loader` on the client (`defineCustomElements`) |
| `@ssr-examples/components-react` | Next.js only: React wrappers; `./next` is the server version |
| `@ssr-examples/ssr-props` | complex props: `ssrProp()` in templates, `ssrPropsOptions()` in the render hook |

## Routes

### `GET /`

The page below, rendered by the framework, with every Stencil component server-rendered.
For most frameworks, a response hook or middleware passes the whole HTML document through
`renderToString()`. Next.js renders each component separately (see its README).

### `GET /health`

`200` with body `ok`.

## Page content

`{Framework}` is the example's display name, e.g. `Nuxt`.

```html
<main>
  <h1>{Framework} + Stencil SSR</h1>

  <!-- `{Framework}` and `{badge}` ('SSR') are framework state, bound in the template -->
  <demo-notice kind="info">Rendered by {Framework}.</demo-notice>

  <demo-card heading="Server-rendered card" variant="highlight">
    <span slot="icon">★</span>
    <p>This card was rendered on the server as Declarative Shadow DOM.</p>
    <!-- a scoped component in the framework's light DOM -->
    <demo-badge tone="success">{badge}</demo-badge>
    <span slot="footer">Footer slot</span>
  </demo-card>

  <!-- framework: on `countChanged`, show the event's detail in #last-count -->
  <demo-counter start="5" step="2"></demo-counter>
  <p id="last-count">Last count: none</p>

  <!-- `tasks` and `stats` are arrays, bound through ssrProp() (see packages/ssr-props) -->
  <demo-task-list tasks="{tasks}"></demo-task-list>
  <demo-stats stats="{stats}"></demo-stats>
  <!-- framework: on click, append { label: 'Delta', value: 9 } to stats -->
  <button id="add-stat" type="button">Add stat</button>
</main>
```

**Bind the notice and badge text, don't write it as static markup.** Compilers like Vue's and
Svelte's turn static subtrees into plain HTML strings that hydrate without being checked, which
hides exactly the light DOM changes this page is meant to catch.

`demo-stats`, the `#last-count` text and the `#add-stat` button are the framework's own state.
They're there to check that the **framework** still hydrates and owns its part of the page,
not only that the Stencil components do.

The page also loads the components on the client: call `defineCustomElements()` from
`@ssr-examples/components/loader` in client-only code.

### Data

```js
const tasks = [
  { title: 'Write components', done: true },
  { title: 'Render with <ssr> & "friends"', done: false },
  { title: 'Hydrate on the client' },
];

const stats = [
  { label: 'Alpha', value: 3 },
  { label: 'Beta', value: 7 },
  { label: 'Gamma', value: 5 },
];
```

## Ports

| Example | Port |
|---|---|
| `node` (no framework; the reference implementation) | 3000 |
| `next` | 3001 |
| `nuxt` | 3002 |
| `astro` | 3003 |
| `sveltekit` | 3004 |
| `solid-start` | 3005 |
| `react-router` | 3006 |
| `angular` | 3007 |
