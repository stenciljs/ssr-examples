export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  app: {
    head: {
      title: 'Nuxt · Stencil SSR',
      htmlAttrs: { lang: 'en' },
      style: [
        {
          innerHTML: `body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; }
main > * { margin-bottom: 1.5rem; }
.demo-notice { display: block; padding: .75rem 1rem; border-radius: 6px; background: #eef2ff; }`,
        },
      ],
    },
  },
});
