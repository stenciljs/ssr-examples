import { renderToString } from '@ssr-examples/components/ssr';
import { ssrPropsOptions } from '@ssr-examples/ssr-props/server';

// Nuxt renders the whole page to a string, then Nitro calls `render:response` with it:
// the one place we see the complete document.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', async (response) => {
    if (typeof response.body !== 'string' || !response.headers?.['content-type']?.includes('text/html')) {
      return;
    }
    const { html, diagnostics } = await renderToString(response.body, {
      reuseWindow: true,
      ...ssrPropsOptions(),
    });
    for (const d of diagnostics) console.warn('[stencil]', d.messageText);
    if (html) response.body = html;
  });
});
