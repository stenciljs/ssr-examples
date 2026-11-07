// Debugging aid: node console-dump.mjs <url> prints the browser console and some light DOM state.
import { chromium } from '@playwright/test';
const url = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage();
p.on('console', (m) => console.log(`[${m.type()}]`, m.text().slice(0, 400)));
p.on('pageerror', (e) => console.log('[pageerror]', e.message));
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
console.log('--- badge light DOM:', await p.evaluate(() => document.querySelector('demo-card demo-badge').innerHTML));
console.log('--- notice light DOM:', await p.evaluate(() => document.querySelector('demo-notice').innerHTML));
await b.close();
