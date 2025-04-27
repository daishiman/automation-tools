import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'e2e',
    include: ['../e2e/**/*.test.{js,ts,tsx}'],
    exclude: ['../unit/**', '../integration/**', '../performance/**'],
    setupFiles: ['../e2e/helpers/setup.ts', '../e2e/helpers/playwright-setup.ts'],
    environment: 'node', // E2Eテストではnode環境で実行
    reporters: ['default', 'html', 'json'],
    outputFile: {
      html: '../../reports/e2e/index.html',
      json: '../../reports/e2e/results.json',
    },
    testTimeout: 120000, // E2Eテストは長時間かかる可能性がある
    // 並列実行を有効化
    threads: true,
    // クリティカルパスのテストの管理はPlaywrightプロジェクト設定で行う
    // カスタムレポートはE2Eテスト用ヘルパーで生成する
  },
  resolve: {
    alias: {
      '@test-utils': path.resolve(__dirname, '../helpers'),
      '@e2e-utils': path.resolve(__dirname, '../e2e/helpers'),
      '@pages': path.resolve(__dirname, '../e2e/pages'),
      '@workflows': path.resolve(__dirname, '../e2e/workflows'),
      '@user-flows': path.resolve(__dirname, '../e2e/flows'),
      '@critical-paths': path.resolve(__dirname, '../e2e/critical'),
      '@accessibility': path.resolve(__dirname, '../e2e/accessibility'),
    },
  },
});
