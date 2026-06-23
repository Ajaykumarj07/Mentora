import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'playwright-e2e.spec.js',
  timeout: 120000,
  expect: {
    timeout: 10000
  },
  fullyParallel: true,
  workers: 4,
  reporter: [
    ['html', { outputFolder: 'reports/playwright-html' }],
    ['json', { outputFile: 'reports/playwright-report.json' }],
    ['list']
  ],
  outputDir: 'reports/traces',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true,
    screenshot: 'on',
    video: 'on',
    trace: 'on',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    }
  ],
  maxFailures: 0
});
