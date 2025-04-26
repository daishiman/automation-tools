import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'unit',
    include: ['../unit/**/*.test.{js,ts,tsx}'],
    exclude: ['../e2e/**', '../integration/**', '../performance/**'],
    setupFiles: [
      '../helpers/setup.ts',
      '../unit/helpers/domain-setup.ts',
      '../unit/helpers/repository-setup.ts',
      '../unit/helpers/rtl-setup.ts',
    ],
    environment: 'jsdom',
    deps: {
      inline: [/src\/.*\.tsx?$/],
    },
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    reporters: ['default', 'html'],
    outputFile: {
      html: '../../reports/unit/index.html',
    },
    threads: true,
  },
  resolve: {
    alias: {
      '@test-utils': path.resolve(__dirname, '../helpers'),
      '@domain-tests': path.resolve(__dirname, '../unit/domain'),
      '@repository-mocks': path.resolve(__dirname, '../unit/mocks/repositories'),
      '@in-memory-repositories': path.resolve(__dirname, '../unit/repositories'),
      '@component-tests': path.resolve(__dirname, '../unit/components'),
    },
  },
});
