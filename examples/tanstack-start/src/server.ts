import { createServerEntry, createStartHandler, defaultRenderHandler } from '@tanstack/react-start/server';
import { renderToString } from '@ssr-examples/components/ssr';

// Render each page as one string (`defaultRenderHandler`, not the streaming default), since
// Stencil's renderToString() needs the whole page.
const startHandler = createStartHandler(defaultRenderHandler);

export default createServerEntry({
  async fetch(request) {
    const response = await startHandler(request);
    if (!response.headers.get('content-type')?.includes('text/html')) return response;

    const { html, diagnostics } = await renderToString(await response.text(), { reuseWindow: true });
    for (const d of diagnostics) console.warn('[stencil]', d.messageText);

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    return new Response(html, { status: response.status, headers });
  },
});
