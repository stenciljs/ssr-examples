import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { renderToString } from '@ssr-examples/components/ssr';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.get('/health', (_req, res) => {
  res.type('text/plain').send('ok');
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Angular renders the whole document and hands it back as a web `Response`: the one place we see
 * the complete HTML. Pass it through Stencil's `renderToString()` before it's sent.
 */
async function renderStencil(response: Response): Promise<Response> {
  if (!response.headers.get('content-type')?.includes('text/html')) {
    return response;
  }
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

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/** Used by the Angular CLI (dev server and build). */
export const reqHandler = createNodeRequestHandler(app);
