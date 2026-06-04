import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'server/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/game-engine.ts'],
      exclude: ['src/**/*.test.ts', 'server/**/*.test.ts'],
      thresholds: {
        branches: 80,
      },
    },
  },
});
