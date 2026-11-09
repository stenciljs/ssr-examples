import type { EntryContext } from 'react-router';
import { ServerRouter } from 'react-router';
import { renderToReadableStream } from 'react-dom/server';
import { renderToString } from '@ssr-examples/components/ssr';

export const streamTimeout = 5_000;

// Stencil's renderToString() needs the whole page, so wait for React to finish (`allReady`)
// instead of streaming it, then render the components.
export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  const stream = await renderToReadableStream(<ServerRouter context={routerContext} url={request.url} />, {
    signal: AbortSignal.timeout(streamTimeout + 1000),
    onError(error) {
      responseStatusCode = 500;
      console.error(error);
    },
  });
  await stream.allReady;

  const { html, diagnostics } = await renderToString(await new Response(stream).text(), { reuseWindow: true });
  for (const d of diagnostics) console.warn('[stencil]', d.messageText);

  responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(html, { headers: responseHeaders, status: responseStatusCode });
}
