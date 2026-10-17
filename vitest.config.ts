import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 15000,
    // Jangan biarkan interval cleanup rate-limiter menahan worker
    teardownTimeout: 5000,
  },
});
