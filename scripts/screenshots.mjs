/**
 * Screenshot each example's page into docs/screenshots/<example>.png, for the READMEs.
 *
 * JavaScript is disabled in the browser, so each screenshot is only the server's HTML: shadow
 * roots come from Declarative Shadow DOM, and nothing renders or hydrates on the client.
 *
 *   node scripts/screenshots.mjs              # every example
 *   node scripts/screenshots.mjs nuxt astro   # just these
 *
 * Starts each example's production server, so build them first (`scripts/test-all.sh` does).
 */
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// playwright is a dependency of tests/conformance
const require = createRequire(path.join(root, 'tests/conformance/package.json'));
const { chromium } = require('@playwright/test');

const PORTS = {
  node: 3000,
  next: 3001,
  nuxt: 3002,
  astro: 3003,
  sveltekit: 3004,
  'solid-start': 3005,
  'react-router': 3006,
  angular: 3007,
  'tanstack-start': 3008,
  eleventy: 3009,
};
const names = process.argv.length > 2 ? process.argv.slice(2) : Object.keys(PORTS);

const outDir = path.join(root, 'docs/screenshots');
await mkdir(outDir, { recursive: true });

const waitFor = async (url) => {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${url} didn't come up`);
};

const browser = await chromium.launch();
try {
  for (const name of names) {
    const port = PORTS[name];
    const server = spawn('pnpm', ['--filter', `@ssr-examples/example-${name}`, 'start'], {
      cwd: root,
      stdio: 'ignore',
      detached: true,
    });
    try {
      await waitFor(`http://localhost:${port}/health`);
      const context = await browser.newContext({
        javaScriptEnabled: false,
        viewport: { width: 760, height: 900 },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });

      // Don't publish a screenshot of a broken render. Locators look inside open shadow roots, so
      // these only match if the browser attached the server's Declarative Shadow DOM.
      const heading = await page.locator('demo-card h2').textContent();
      if (heading !== 'Server-rendered card') throw new Error(`${name}: card heading is ${JSON.stringify(heading)}`);
      const badges = await page.locator('demo-task-list demo-badge').allTextContents();
      if (badges.join() !== 'done,todo,todo') throw new Error(`${name}: task badges are ${JSON.stringify(badges)}`);
      const bars = await page.locator('demo-stats li').count();
      if (bars !== 3) throw new Error(`${name}: ${bars} stats bars, not 3`);

      const file = path.join(outDir, `${name}.png`);
      await page.locator('main').screenshot({ path: file });
      console.log(`${name}: ${path.relative(root, file)}`);
      await context.close();
    } finally {
      // the whole process group: pnpm and the server it started
      process.kill(-server.pid, 'SIGTERM');
    }
  }
} finally {
  await browser.close();
}
