import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.*'],
    globals: true,
    environment: 'node',
    watch: false,
  },
});
