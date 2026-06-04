import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/game-engine.ts'],
      exclude: ['src/**/*.test.ts'],
      thresholds: {
        branches: 80,
      },
    },
  },
});
