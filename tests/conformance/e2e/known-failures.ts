import { test } from '@playwright/test';

/**
 * Tests an example is known to fail, by example (the `EXAMPLE` variable `scripts/test-all.sh`
 * sets) and test title. They run with `test.fail()`, so the run stays green while they fail and
 * reports them as soon as they pass.
 */
const KNOWN_FAILURES: Record<string, Record<string, string>> = {
  // Svelte 5 hydrates an element's changeable content by walking its real DOM children, which
  // in a scoped component start with Stencil's own markup, so it re-renders the page.
  // See examples/sveltekit/README.md.
  sveltekit: {
    "framework updates its content in a scoped component's slot":
      "Svelte 5 can't hydrate changeable content slotted into a scoped component, so the page leaves out #update-badge",
  },
};

/** Call in a `beforeEach`: marks the current test as expected to fail, if it's listed. */
export function expectKnownFailures() {
  test.beforeEach(({}, testInfo) => {
    const reason = KNOWN_FAILURES[process.env.EXAMPLE ?? '']?.[testInfo.title];
    test.fail(reason !== undefined, reason);
  });
}
