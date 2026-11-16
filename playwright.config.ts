import { defineConfig, devices } from '@playwright/test';
import detect from 'detect-port';

// Playwright loads this config once per process, so the chosen port travels
// through the environment; picking again in a worker would give another port.
const port = Number(process.env['E2E_PORT'] ?? (await detect(4321)));

process.env['E2E_PORT'] = String(port);

const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e/specs/',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Always serve the build made by `npm run build`; reusing a running preview
  // would silently test a previous build.
  webServer: {
    command: `npm run preview -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    env: { ASTRO_PREVIEW_BACKGROUND: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 60_000,
  },
});
