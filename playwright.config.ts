import { defineConfig, devices } from '@playwright/test';

const PORT = 8890;
// Isolated data folder: tests never touch data/, templates/ or resumes/ in the repo.
const HOME = 'e2e/.home';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    // Wipe the data folder first so every run starts from the seeded Classic template and sample Base resume.
    command: `rm -rf ${HOME} && pnpm --filter @rc/web build && SERVE_WEB=1 API_PORT=${PORT} pnpm --filter @rc/api start`,
    url: `http://127.0.0.1:${PORT}/api/info`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { RC_HOME: `${process.cwd()}/${HOME}` },
  },
});
