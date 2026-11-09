# Angular

Angular renders the page with `@angular/ssr`, then the Express server in `src/server.ts` passes
the whole document through Stencil's `renderToString()` before sending it. Angular then hydrates
the page (non-destructive hydration, `provideClientHydration()`), and the Stencil components
hydrate alongside it.

```sh
pnpm build          # at the repo root, once
pnpm --filter @ssr-examples/example-angular dev       # http://localhost:3007
# or
pnpm --filter @ssr-examples/example-angular build && pnpm --filter @ssr-examples/example-angular start
BASE_URL=http://localhost:3007 pnpm test
```

`ng serve` runs the same `src/server.ts` (its exported `reqHandler`), so dev and production render
the same way.

## The integration

| File | What it does |
|---|---|
| [`src/server.ts`](src/server.ts) | `renderToString()` on every HTML `Response` from `AngularNodeAppEngine.handle()`, plus `GET /health` |
| [`src/main.ts`](src/main.ts) | awaits `defineCustomElements()`, then `bootstrapApplication()` |
| [`src/app/app.ts`](src/app/app.ts) | the page: plain custom elements in an Angular template, with `CUSTOM_ELEMENTS_SCHEMA` |
| [`src/app/app.config.server.ts`](src/app/app.config.server.ts) | `RenderMode.Server`, so the page is rendered (and passed through Stencil) on every request |
| [`angular.json`](angular.json) | `security.allowedHosts`: Angular 22 rejects requests for hosts not listed here |

### Server

```ts
// src/server.ts
async function renderStencil(response: Response): Promise<Response> {
  if (!response.headers.get('content-type')?.includes('text/html')) {
    return response;
  }
  const page = await response.text();
  const { html, diagnostics } = await renderToString(page, { reuseWindow: true });
  for (const d of diagnostics) console.warn('[stencil]', d.messageText);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html || page, { status: response.status, statusText: response.statusText, headers });
}

app.use(async (req, res, next) => {
  try {
    const response = await angularApp.handle(req);
    if (!response) return next();
    await writeResponseToNodeResponse(await renderStencil(response), res);
  } catch (err) {
    next(err);
  }
});
```

`AngularNodeAppEngine.handle()` returns the finished document as a web `Response`, so this is
the one place that sees the complete HTML. Angular's hydration data (`ngh` attributes,
`<script id="ng-state">`) and its event replay script go through unchanged. This runs in the
Express server, not inside Angular's renderer, so Angular's server DOM never sees Stencil's
output.

### Client

```ts
// src/main.ts
defineCustomElements()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
```

**This must finish before Angular hydrates.** `defineCustomElements()` is async, so bootstrap in
its `.then()`. Stencil's server render changes the light DOM of
`scoped` and unencapsulated components (`demo-badge`, `demo-notice`): it adds the component's own
nodes and hydration comments around the slotted text. Angular's hydration finds each node by
walking the DOM (`firstChild`, `nextSibling`) and checks its type. Once the components are
defined, Stencil's [light DOM patches](https://stenciljs.com/docs/config/compat#lightdompatches)
make those accessors return only the slotted content, so Angular finds the text node it rendered.

If the components are defined after hydration (for example in `bootstrapApplication().then()`),
Angular finds Stencil's `<!--r.1-->` comment where it expects its text node, and throws:

```
NG0500: During hydration Angular expected a text node but found a comment node.
<demo-notice ...>
  #text  <-- AT THIS LOCATION
```

Angular doesn't fall back to client rendering here: the app fails to bootstrap, so events and
bindings stop working.

## Complex props

`demo-task-list` and `demo-stats` take array properties. In the template:

```html
<demo-task-list [attr.tasks]="ssrAttr(tasks)" [tasks]="tasks"></demo-task-list>
<demo-stats [attr.stats]="ssrAttr(stats())" [stats]="stats()"></demo-stats>
```

```ts
private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

protected ssrAttr(value: unknown) {
  return this.isServer ? ssrProp(value) : null;
}
```

Angular sets `[stats]` as a **property**, and its server DOM never serializes properties, so a
`[stats]="ssrProp(stats())"` reference would never reach the HTML. So the template binds both:

- On the server, `[attr.stats]` writes the `ssrProp()` reference (from
  `@ssr-examples/components/ssr-prop`) as an attribute; `ssrProp()` keeps the array in a
  registry, and Stencil's SSR runtime, in the same process, swaps the reference for the array
  while it sets up the component. Each component then carries the value to the browser itself:
  `@Prop({ serialize: 'json' })` writes it to the component's attribute on the server, and reads it back before the component first renders. If an object prop is set on the server and
  the component has no serializer (`serialize: 'json'` or a `@PropSerialize()`), `renderToString()` adds a warning to `diagnostics`,
  which `src/server.ts` prints. (These need `@stencil/core` 5.0.0-beta.36 or later.)
- On the client, `ssrAttr()` returns `null`, so Angular leaves the attribute off, and `[stats]`
  sets the property as usual. Later updates (`#add-stat`) work normally.

Don't bind `[attr.stats]="ssrProp(stats())"` on its own: on the client `ssrProp()` returns the
array, which Angular would write as the attribute `[object Object]`.

See [Complex props](../../README.md#complex-props).

## Things to know

- **Events:** `(countChanged)="lastCount.set($event.detail)"` works as written. Angular listens
  for the event name with the exact case.
- **Text bindings in light-DOM components** (`<demo-badge>{{ badge() }}</demo-badge>`): Angular
  keeps a reference to the text node it hydrated and writes to it on updates. That's only the
  right node because the components were defined first. Leave `compat.lightDomPatches` on.
- **`ngSkipHydration` is not a fix.** Putting it on the host component (here `app-root`) makes the
  suite pass even with the components defined late, but only because Angular throws away the
  component's server DOM and renders it again on the client. Every server-rendered Stencil
  component is removed and recreated, which is the work SSR was meant to save. Defining the
  components first lets Angular hydrate in place.
- **`RenderMode.Server`:** without server routes, `outputMode: "server"` prerenders `/` at build
  time. The prerendered `dist/angular/browser/index.html` is Angular's output only, with no
  Stencil SSR in it. It still works through this server, because `handle()` serves it and the
  hook renders it on every request, but anything that serves that file directly (a CDN, static
  hosting) sends it without Stencil's markup. This example uses `RenderMode.Server` so the page
  is clearly rendered per request.
- **Allowed hosts:** Angular 22 answers requests for unlisted hosts with `400`
  (`Header "host" with value "localhost:3007" is not allowed`). `localhost` is listed in
  `angular.json`; add your own hosts there.
- **Critical CSS inlining** runs inside Angular, before Stencil adds classes like
  `.demo-notice`, so those rules aren't inlined. The full stylesheet still loads, so this is only
  a possible flash of unstyled content.
