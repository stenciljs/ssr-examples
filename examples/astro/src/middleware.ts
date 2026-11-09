import { defineMiddleware } from 'astro:middleware';
import { renderToString } from '@ssr-examples/components/ssr';

// Astro streams pages. `next()` returns the Response; read the whole body, render the Stencil
// components in it, and send a new Response with the result.
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (!response.headers.get('content-type')?.includes('text/html')) {
    return response;
  }
  const { html, diagnostics } = await renderToString(await response.text(), { reuseWindow: true });
  for (const d of diagnostics) console.warn('[stencil]', d.messageText);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
});
