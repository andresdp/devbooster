import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { mode, baseURL, databaseURL } from './support/env.js';

const backendDir = fileURLToPath(new URL('../backend', import.meta.url));
const frontendDir = fileURLToPath(new URL('../frontend', import.meta.url));

// reuseExistingServer is false: never test against the developer's own database.
const managedServers = [
  {
    command: 'uv run uvicorn app.main:app --port 8000',
    cwd: backendDir,
    url: 'http://localhost:8000/api/v1/boards',
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      DATABASE_URL: databaseURL,
      SEED_ON_STARTUP: 'false',
      CORS_ORIGINS: 'http://localhost:5173',
    },
  },
  {
    command: 'npm run dev -- --port 5173 --strictPort',
    cwd: frontendDir,
    url: 'http://localhost:5173',
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: { VITE_API_BASE_URL: 'http://localhost:8000' },
  },
];

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  globalSetup: './global-setup.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: mode === 'external' ? undefined : managedServers,
});
