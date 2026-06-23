import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'playwright-e2e.spec.js',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  workers: 8,
  retries: 0,
  reporter: [
    ['html', { outputFolder: 'reports/playwright-html', open: 'never' }],
    ['json', { outputFile: 'reports/playwright-report.json' }],
    ['list']
  ],
  outputDir: 'reports/traces',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    actionTimeout: 5000,
    navigationTimeout: 10000
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    }
  ],
  maxFailures: 0
});
