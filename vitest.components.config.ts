import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CI環境かどうかを検出
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './junit.xml',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary'],
      reportsDirectory: './coverage',
    },
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{e2e,integration,performance}/**',
    ],
    // CI環境ではタイムアウトを延長
    testTimeout: isCI ? 15000 : 5000,
    // メモリリーク検出
    logHeapUsage: true,
    // グローバルセットアップとティアダウン
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
