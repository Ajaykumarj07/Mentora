import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'playwright-e2e.spec.js',
  timeout: 120000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'reports/playwright-html' }],
    ['json', { outputFile: 'reports/playwright-report.json' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:3000',
    headless: false,
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
  ]
});
