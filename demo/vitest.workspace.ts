import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'server',
      include: ['server/**/*.test.ts'],
      environment: 'node',
      globals: true,
      pool: 'forks',
    },
  },
  {
    extends: './vite.config.ts',
    test: {
      name: 'client',
      include: ['src/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
    },
  },
]);
