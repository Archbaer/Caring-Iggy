import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  // Disabled fullyParallel: API tests use beforeAll shared state (createdAnimalId/deleteTargetId).
  // If parallel needed, each test.describe should create its own resources in beforeEach.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    // Setup project — authenticate all 3 roles
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // API contract tests — no browser needed
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: BASE_URL,
      },
      dependencies: ['setup'],
    },

    // Auth tests — unauthenticated
    {
      name: 'anon',
      testMatch: /auth\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: BASE_URL,
        storageState: { cookies: [], origins: [] },
      },
      dependencies: ['setup'],
    },

    // Form tests — authenticated as staff
    {
      name: 'staff-forms',
      testMatch: /forms\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: BASE_URL,
        storageState: '.auth/staff.json',
      },
      dependencies: ['setup'],
    },

    // Default — chromium smoke tests (legacy, no storageState)
    {
      name: 'chromium',
      testMatch: /smoke\.spec\.ts|diagnostic\.spec\.ts|auth-debug\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
