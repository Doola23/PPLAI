import { defineConfig, devices } from '@playwright/test';

const API = 'http://localhost:3011';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5183',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'node ../backend/scripts/e2e-server.js',
      url: `${API}/health`,
      env: { PORT: '3011', FRONTEND_URL: 'http://localhost:5183' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'npx vite --port 5183 --strictPort',
      url: 'http://localhost:5183',
      env: { VITE_API_URL: API, E2E: '1' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
