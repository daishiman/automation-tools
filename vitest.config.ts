import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './junit.xml',
    },
    testTimeout: 600000,
    cache: {
      dir: '.vitest-cache',
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/scripts/**',
      '**/*.d.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '../../../../../../src': path.resolve(__dirname, './src'),
      '../../../../../src': path.resolve(__dirname, './src'),
      '../../../../src': path.resolve(__dirname, './src'),
      '../../../src': path.resolve(__dirname, './src'),
      '../../src': path.resolve(__dirname, './src'),
      '../src': path.resolve(__dirname, './src'),
    },
  },
});
