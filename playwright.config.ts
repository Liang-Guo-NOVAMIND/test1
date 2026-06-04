import { defineConfig } from '@playwright/test';

const extraLibPath = '/tmp/chrome-libs/usr/lib/x86_64-linux-gnu:/tmp/chrome-libs/lib/x86_64-linux-gnu';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 1,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      env: {
        ...process.env,
        LD_LIBRARY_PATH: extraLibPath + (process.env.LD_LIBRARY_PATH ? ':' + process.env.LD_LIBRARY_PATH : ''),
      },
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    },
  },
  webServer: {
    command: 'npx vite --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
