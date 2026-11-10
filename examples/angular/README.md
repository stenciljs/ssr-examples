# Angular

Server-rendering Stencil components in an Angular app with `@angular/ssr`.

<img src="../../docs/screenshots/angular.png" alt="The page, server-rendered by Angular" width="380">

<sub>The server's HTML, with JavaScript off.</sub>

```sh
pnpm install && pnpm build   # at the repo root, once
pnpm dev                     # in this folder: http://localhost:3007
```

## 1. Render the components on the server

`AngularNodeAppEngine.handle()` returns the finished page as a `Response`. Pass HTML responses
through `renderToString()` before sending them ([`src/server.ts`](src/server.ts); `ng serve` uses
the same file):

```ts
import { renderToString } from '@ssr-examples/components/ssr';

async function renderStencil(response: Response): Promise<Response> {
  if (!response.headers.get('content-type')?.includes('text/html')) return response;
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

## 2. Use the components

Use the library's Angular wrappers, `@ssr-examples/components-angular`, like any standalone
component ([`src/app/app.ts`](src/app/app.ts)):

```ts
import { DemoCounter, DemoStats } from '@ssr-examples/components-angular';

@Component({
  imports: [DemoCounter, DemoStats],
  template: `
    <demo-counter [start]="5" [step]="2" (countChanged)="lastCount.set($event.detail)"></demo-counter>
    <demo-stats [stats]="stats()"></demo-stats>
  `,
})
export class App {}
```

- **Defining the components:** each wrapper defines its element when it loads, so before Angular
  hydrates. Nothing to call in [`src/main.ts`](src/main.ts).
- **Objects and arrays:** bind them like any input. On the server, the wrappers hand them to
  `renderToString()` through `ssrProp()` (the library sets this up, see below).
- **Events:** `(countChanged)` listens for `countChanged`, exactly as written.
- **Render mode:** Angular prerenders at build time by default, and a prerendered file served
  directly (CDN, static hosting) has no Stencil markup. Use `RenderMode.Server`
  ([`src/app/app.config.server.ts`](src/app/app.config.server.ts)).
- **Allowed hosts:** Angular answers requests for unlisted hosts with `400`. Add yours to
  `security.allowedHosts` in [`angular.json`](angular.json).

## For the library author

The wrappers come from the Angular output target. Angular's server DOM never writes properties
to the HTML, so set `ssrPropModule`: on the server, the wrappers then write their inputs as
attributes ([`packages/components/stencil.config.ts`](../../packages/components/stencil.config.ts)):

```ts
angularOutputTarget({
  componentCorePackage: '@ssr-examples/components',
  directivesProxyFile: '../components-angular/src/components.ts',
  outputType: 'standalone',
  ssrPropModule: '@ssr-examples/components/ssr-prop',
}),
```
