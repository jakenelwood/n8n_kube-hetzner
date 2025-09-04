import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'https://n8n.quotennica.com';

const httpCredentials = (process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASSWORD)
  ? { username: process.env.BASIC_AUTH_USER, password: process.env.BASIC_AUTH_PASSWORD }
  : undefined;

export default defineConfig({
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    httpCredentials,
    ignoreHTTPSErrors: false,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
});

