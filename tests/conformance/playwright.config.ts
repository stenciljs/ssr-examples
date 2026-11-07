import { defineConfig, devices } from '@playwright/test';

/**
 * BASE_URL=http://localhost:3002 pnpm test   -> test a running example
 * pnpm test                                   -> starts examples/node on :3000
 */
const external = process.env.BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: external ?? 'http://localhost:3000' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(process.env.ALL_BROWSERS
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],
  webServer: external
    ? undefined
    : {
        command: 'pnpm --filter @ssr-examples/example-node start',
        url: 'http://localhost:3000/health',
        reuseExistingServer: true,
      },
});
