import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',

  fullyParallel: true,
  workers: process.env.WORKERS ? Number(process.env.WORKERS) : 4,

  retries: isCI ? 2 : 1,
  forbidOnly: isCI,

  timeout: 120_000,
  expect: { timeout: 20_000 },

  reporter: isCI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://automationintesting.online',
    actionTimeout: 25_000,
    navigationTimeout: 60_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
