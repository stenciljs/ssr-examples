import { expect, test, type Page } from '@playwright/test';

const TAGS = ['demo-notice', 'demo-card', 'demo-badge', 'demo-counter', 'demo-task-list', 'demo-stats'];

test.describe('JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false });

  test('page is fully rendered from the server HTML alone', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('demo-card h2')).toHaveText('Server-rendered card');
    await expect(page.locator('demo-counter .value')).toHaveText('5');
    await expect(page.locator('demo-task-list li')).toHaveCount(3);
    await expect(page.locator('demo-stats li')).toHaveCount(3);
    await expect(page.locator('demo-card demo-badge .badge')).toHaveCSS('background-color', 'rgb(209, 250, 229)');
    // light DOM component: its own label, then the slotted text, with the space between them
    await expect(page.locator('demo-notice')).toHaveText(/^\s*Note:\s+Rendered by .+\.\s*$/);
  });
});

/**
 * Records, from before any page script runs:
 * - `ssrHosts`: every server-rendered `demo-*` host, as the parser inserts it. Checked later with
 *   `isConnected`: a framework that failed to hydrate and re-rendered instead will have replaced
 *   them (by then Stencil has removed `s-id`, so the new elements can't be told apart by markup).
 * - `statsEmpty`: whether `demo-stats` ever showed its empty state (it hydrated without its prop)
 */
async function watchHydration(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __ssrHosts: Element[]; __statsEmpty: boolean };
    w.__ssrHosts = [];
    w.__statsEmpty = false;
    const record = (el: Element) => {
      if (el.tagName.startsWith('DEMO-') && el.hasAttribute('s-id')) w.__ssrHosts.push(el);
    };
    const onRecords = (records: MutationRecord[]) => {
      for (const r of records) {
        for (const n of Array.from(r.addedNodes)) {
          if (!(n instanceof Element)) continue;
          record(n);
          n.querySelectorAll('[s-id]').forEach(record);
        }
      }
    };
    const observer = new MutationObserver(onRecords);
    observer.observe(document, { childList: true, subtree: true });
    // the parser is done once the document is: anything added later isn't server-rendered
    document.addEventListener('DOMContentLoaded', () => {
      onRecords(observer.takeRecords());
      observer.disconnect();
    });
    const poll = () => {
      if (document.querySelector('demo-stats')?.shadowRoot?.querySelector('.empty')) w.__statsEmpty = true;
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  });
}

/** Tags of recorded server-rendered hosts no longer in the document. */
const replacedHosts = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __ssrHosts: Element[] }).__ssrHosts
      .filter((el) => !el.isConnected)
      .map((el) => el.tagName.toLowerCase()),
  );

test.describe('JavaScript enabled', () => {
  let errors: string[];
  let warnings: string[];

  test.beforeEach(async ({ page }) => {
    errors = [];
    warnings = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
      if (m.type() === 'warning') warnings.push(m.text());
    });
    await watchHydration(page);
    await page.goto('/');
    for (const tag of TAGS) {
      await expect(page.locator(tag).first(), tag).toHaveClass(/hydrated/);
    }
    // The server HTML already says `hydrated`. Stencil's client removes each host's `s-id` as
    // it hydrates it, so none left (shadow roots included) means they all really did.
    await expect(page.locator('[s-id]')).toHaveCount(0);
    // let the framework finish hydrating too
    await page.waitForLoadState('networkidle');
  });

  test('hydrates without errors or hydration warnings', async () => {
    expect(errors).toEqual([]);
    expect(warnings.filter((w) => /hydrat|mismatch/i.test(w))).toEqual([]);
  });

  test('server-rendered components are hydrated in place, not replaced', async ({ page }) => {
    // light DOM hosts only: those inside shadow roots aren't visible to the observer
    expect(await page.evaluate(() => (window as any).__ssrHosts.length)).toBeGreaterThanOrEqual(6);
    expect(await replacedHosts(page)).toEqual([]);
  });

  test('server markup is reused, not duplicated', async ({ page }) => {
    await expect(page.locator('demo-card article')).toHaveCount(1);
    await expect(page.locator('demo-card h2')).toHaveText('Server-rendered card');
    await expect(page.locator('demo-card > [slot="icon"]')).toHaveCount(1);
    await expect(page.locator('demo-card > p')).toHaveCount(1);
    await expect(page.locator('demo-card demo-badge .badge')).toHaveCount(1);
    await expect(page.locator('demo-card demo-badge .badge')).toHaveText('SSR');
    await expect(page.locator('demo-counter .value')).toHaveCount(1);
    await expect(page.locator('demo-task-list li')).toHaveCount(3);
    await expect(page.locator('demo-notice .demo-notice__label')).toHaveCount(1);
    // the framework's slotted text survives both hydrations
    await expect(page.locator('demo-notice')).toHaveText(/^\s*Note:\s+Rendered by .+\.\s*$/);
  });

  test('complex prop is there from the first client render', async ({ page }) => {
    await expect(page.locator('demo-stats li')).toHaveCount(3);
    expect(await page.evaluate(() => (window as any).__statsEmpty)).toBe(false);
  });

  test('Stencil component is interactive and the framework hears its events', async ({ page }) => {
    await page.locator('demo-counter button').click();
    await expect(page.locator('demo-counter .value')).toHaveText('7');
    await expect(page.locator('#last-count')).toHaveText('Last count: 7');
  });

  test('framework still owns the complex prop', async ({ page }) => {
    await page.locator('#add-stat').click();
    await expect(page.locator('demo-stats li')).toHaveCount(4);
    await expect(page.locator('demo-stats li').last()).toContainText('Delta');
  });
});
