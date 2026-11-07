import { PassThrough } from 'node:stream';
import type { EntryContext } from 'react-router';
import { ServerRouter } from 'react-router';
import { renderToPipeableStream } from 'react-dom/server';
import { renderToString } from '@ssr-examples/components/ssr';
import { ssrPropsOptions } from '@ssr-examples/ssr-props/server';

export const streamTimeout = 5_000;

// React Router renders the document with React's streaming renderer. Stencil's
// renderToString() needs the whole document, so wait for everything (`onAllReady`, not
// `onShellReady`), collect the stream into a string, render the components, then send it.
export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  if (request.method.toUpperCase() === 'HEAD') {
    return new Response(null, { status: responseStatusCode, headers: responseHeaders });
  }

  return new Promise<Response>((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(() => abort(), streamTimeout + 1000);

    const { pipe, abort } = renderToPipeableStream(<ServerRouter context={routerContext} url={request.url} />, {
      onAllReady() {
        const chunks: Buffer[] = [];
        const body = new PassThrough();
        body.on('data', (chunk: Buffer) => chunks.push(chunk));
        body.on('error', reject);
        body.on('end', async () => {
          clearTimeout(timeoutId);
          timeoutId = undefined;
          try {
            const { html, diagnostics } = await renderToString(Buffer.concat(chunks).toString('utf8'), {
              reuseWindow: true,
              ...ssrPropsOptions(),
            });
            for (const d of diagnostics) console.warn('[stencil]', d.messageText);
            responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
            resolve(new Response(html, { headers: responseHeaders, status: responseStatusCode }));
          } catch (error) {
            reject(error);
          }
        });
        pipe(body);
      },
      onShellError(error: unknown) {
        reject(error);
      },
      onError(error: unknown) {
        responseStatusCode = 500;
        console.error(error);
      },
    });
  });
}
