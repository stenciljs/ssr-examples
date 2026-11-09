// Stencil components server-rendered with no framework: the page is a template string, passed
// through renderToString() before it's sent.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { renderToString } from '@ssr-examples/components/ssr';
import { ssrProp } from '@ssr-examples/components/ssr-prop';
import { stats, tasks } from '@ssr-examples/demo-data';

const PORT = Number(process.env.PORT ?? 3000);
const require = createRequire(import.meta.url);
const pkgDir = (name) => path.dirname(require.resolve(`${name}/package.json`));

// The components' client code, served as-is (no bundler)
const STENCIL_DIR = path.join(pkgDir('@ssr-examples/components'), 'dist/loader-bundle/esm');

const attr = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const page = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Node · Stencil SSR</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; }
      main > * { margin-bottom: 1.5rem; }
      .demo-notice { display: block; padding: .75rem 1rem; border-radius: 6px; background: #eef2ff; }
    </style>
    <script type="module" src="/client.js"></script>
  </head>
  <body>
    <main>
      <h1>Node + Stencil SSR</h1>
      <demo-notice kind="info">Rendered by Node.</demo-notice>
      <demo-card heading="Server-rendered card" variant="highlight">
        <span slot="icon">★</span>
        <p>This card was rendered on the server as Declarative Shadow DOM.</p>
        <demo-badge tone="success">SSR</demo-badge>
        <span slot="footer">Footer slot</span>
      </demo-card>
      <demo-counter start="5" step="2"></demo-counter>
      <p id="last-count">Last count: none</p>
      <demo-task-list tasks="${attr(ssrProp(tasks))}"></demo-task-list>
      <demo-stats stats="${attr(ssrProp(stats))}"></demo-stats>
      <button id="add-stat" type="button">Add stat</button>
    </main>
  </body>
</html>`;

// The "framework" for this page: a few lines of DOM code
const clientJs = `
import { defineCustomElements } from '/stencil/loader.js';
defineCustomElements();
const stats = document.querySelector('demo-stats');
document.querySelector('demo-counter').addEventListener('countChanged', (e) => {
  document.querySelector('#last-count').textContent = 'Last count: ' + e.detail;
});
document.querySelector('#add-stat').addEventListener('click', () => {
  stats.stats = [...stats.stats, { label: 'Delta', value: 9 }];
});
`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/health') {
      return res.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
    }
    if (url.pathname === '/client.js') {
      return res.writeHead(200, { 'content-type': 'text/javascript' }).end(clientJs);
    }
    if (url.pathname.startsWith('/stencil/')) {
      const file = path.join(STENCIL_DIR, path.normalize(url.pathname.slice('/stencil/'.length)));
      if (file.startsWith(STENCIL_DIR)) {
        return res.writeHead(200, { 'content-type': 'text/javascript' }).end(await readFile(file));
      }
    }
    if (url.pathname === '/') {
      const { html, diagnostics } = await renderToString(page(), { reuseWindow: true });
      for (const d of diagnostics) console.warn(d.messageText);
      return res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html);
    }
    res.writeHead(404).end('not found');
  } catch (e) {
    if (e.code === 'ENOENT') return res.writeHead(404).end('not found');
    console.error(e);
    res.writeHead(500).end('error');
  }
});

server.listen(PORT, () => console.log(`http://localhost:${PORT}`));
