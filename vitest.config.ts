import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/game-engine.ts', 'src/gomoku-engine.ts'],
      exclude: ['src/**/*.test.ts'],
      thresholds: {
        branches: 80,
      },
    },
  },
});
