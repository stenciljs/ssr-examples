import { defineCustomElements } from '@ssr-examples/components/loader';

// Nuxt awaits plugins before Vue hydrates the app. `defineCustomElements()` is async, so wait for
// it: the components must be defined before Vue hydrates.
export default defineNuxtPlugin(async () => {
  await defineCustomElements();
});
