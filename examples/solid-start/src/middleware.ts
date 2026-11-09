import { createMiddleware } from '@solidjs/start/middleware';
import { renderToString } from '@ssr-examples/components/ssr';

// Runs around SolidStart's page handler. `entry-server.tsx` renders in `async` mode, so `next()`
// resolves to the complete HTML document as a string: the one place we see the whole page.
export default createMiddleware([
  async (event, next) => {
    const body = await next();
    if (typeof body !== 'string' || !event.res.headers.get('content-type')?.includes('text/html')) {
      return body;
    }
    const { html, diagnostics } = await renderToString(body, { reuseWindow: true });
    for (const d of diagnostics) console.warn('[stencil]', d.messageText);
    return html ?? body;
  },
]);
