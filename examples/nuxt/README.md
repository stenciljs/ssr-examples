# Nuxt

Server-rendering Stencil components in a Nuxt app.

```sh
pnpm install && pnpm build   # at the repo root, once
pnpm dev                     # in this folder: http://localhost:3002
```

## 1. Render the components on the server

Nitro's `render:response` hook receives the finished page. Pass it through `renderToString()`
([`server/plugins/stencil-ssr.ts`](server/plugins/stencil-ssr.ts)):

```ts
import { renderToString } from '@ssr-examples/components/ssr';

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

## 2. Define the components before Vue hydrates

A `.client` plugin runs before hydration, and Nuxt waits for an async one
([`app/plugins/stencil.client.ts`](app/plugins/stencil.client.ts)):

```ts
import { defineCustomElements } from '@ssr-examples/components/loader';

export default defineNuxtPlugin(async () => {
  await defineCustomElements();
});
```

Don't define them later, such as in `onMounted`: Vue would report hydration mismatches and
re-render the components.

## 3. Use the components

Tell Vue they're custom elements ([`nuxt.config.ts`](nuxt.config.ts)):

```ts
vue: {
  compilerOptions: {
    isCustomElement: (tag) => tag.startsWith('demo-'),
  },
},
```

Then use them like any element ([`app/app.vue`](app/app.vue)):

```vue
<script setup lang="ts">
import { ssrProp } from '@ssr-examples/components/ssr-prop';
</script>

<template>
  <demo-counter start="5" step="2" @countChanged="lastCount = $event.detail" />
  <demo-stats :stats="ssrProp(stats)" />
</template>
```

- **Objects and arrays:** wrap them in `ssrProp()`, or Vue leaves them out of the server HTML.
  In the browser it returns the value as it is. See
  [Passing objects and arrays](../../README.md#passing-objects-and-arrays).
- **Events:** `@countChanged` listens for `countChanged`, exactly as written.
