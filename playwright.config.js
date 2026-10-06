// End-to-end smoke test. Needs a built client (npm run build) and a disposable
// PostgreSQL database in E2E_DATABASE_URL (it is wiped before the run!).
import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL || 'postgres://petmanager:petmanager@localhost:5432/petmanager_e2e';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node e2e/reset-db.mjs && node server/src/index.js',
    url: `http://localhost:${PORT}/api/healthz`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NODE_ENV: 'test',
      PORT: String(PORT),
      DATABASE_URL: E2E_DATABASE_URL,
      STATIC_DIR: 'client/dist',
      REMINDERS_ENABLED: 'false',
      AUTH_RATE_LIMIT: '100',
    },
  },
});
