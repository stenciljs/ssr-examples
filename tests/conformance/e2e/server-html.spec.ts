import { expect, test } from '@playwright/test';

/** The tag, and everything up to the end of its first shadow root, of the first `<tag ...>`. */
function hostWithShadow(html: string, tag: string) {
  const start = html.indexOf(`<${tag}`);
  expect(start, `<${tag}> in the page`).toBeGreaterThan(-1);
  const end = html.indexOf('</template>', start);
  return html.slice(start, end);
}

test.describe('server HTML', () => {
  let html: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/html');
    html = await res.text();
  });

  test('every component is server-rendered', () => {
    for (const tag of ['demo-notice', 'demo-card', 'demo-badge', 'demo-counter', 'demo-task-list', 'demo-stats']) {
      // attribute values may contain `>`, so step over quoted values
      expect(html, tag).toMatch(new RegExp(`<${tag}(?:\\s+[^\\s=>]+(?:="[^"]*")?)*?\\s+s-id="\\d+"`));
    }
  });

  test('shadow components use Declarative Shadow DOM', () => {
    for (const tag of ['demo-card', 'demo-counter', 'demo-task-list', 'demo-stats']) {
      expect(hostWithShadow(html, tag), tag).toContain('<template shadowrootmode="open"');
    }
  });

  test('scoped styles are in the head', () => {
    // as Stencil's own `<style sty-id="sc-demo-badge">`, or merged into the framework's (Next.js)
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toMatch(/<style[^>]*>[^<]*\.sc-demo-badge-h\{/);
  });

  test('no-encapsulation component renders into light DOM', () => {
    expect(html).toMatch(/<demo-notice[^>]*class="[^"]*demo-notice--info/);
  });

  test('card renders its props', () => {
    expect(hostWithShadow(html, 'demo-card')).toContain('Server-rendered card');
  });

  test('counter renders its start value', () => {
    expect(hostWithShadow(html, 'demo-counter')).toMatch(/class="value"[^>]*>(\s|<!--[^>]*-->)*5\b/);
  });

  test('complex prop with markup characters reaches the server render', () => {
    const list = hostWithShadow(html, 'demo-task-list');
    expect(list).toContain('2 of 3 remaining');
    expect(list).toContain('Render with &lt;ssr&gt; &amp; "friends"');
  });

  test('complex property prop reaches the server render', () => {
    const stats = hostWithShadow(html, 'demo-stats');
    for (const label of ['Alpha', 'Beta', 'Gamma']) expect(stats).toContain(label);
    expect(stats).not.toContain('No stats');
    expect(html).not.toContain('__ssr_prop__');
    expect(html).not.toContain('[object Object]');
  });

  test('hydration IDs are unique', () => {
    const ids = [...html.matchAll(/\ss-id="(\d+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThanOrEqual(6);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('framework content is present', () => {
    expect(html).toMatch(/<h1[^>]*>[^<]*\+ Stencil SSR<\/h1>/);
    expect(html).toContain('id="add-stat"');
    expect(html).toContain('Last count: none');
  });

  test('concurrent requests all render', async ({ request }) => {
    const pages = await Promise.all(Array.from({ length: 8 }, () => request.get('/').then((r) => r.text())));
    for (const page of pages) {
      expect(hostWithShadow(page, 'demo-stats')).toContain('Gamma');
      expect(hostWithShadow(page, 'demo-task-list')).toContain('2 of 3 remaining');
    }
  });
});
