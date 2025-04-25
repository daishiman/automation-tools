import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'integration',
    include: ['../integration/**/*.test.{js,ts,tsx}'],
    exclude: ['../e2e/**', '../unit/**', '../performance/**'],
    setupFiles: [
      '../helpers/setup.ts',
      '../integration/helpers/setup.ts',
      '../integration/helpers/api-setup.ts',
      '../integration/helpers/db-setup.ts',
      '../integration/helpers/mastra-setup.ts',
    ],
    environment: 'jsdom',
    reporters: ['default', 'html'],
    outputFile: {
      html: '../../reports/integration/index.html',
    },
    testTimeout: 30000, // 統合テストはより長い時間がかかることがある
    threads: true, // 並列実行を有効化
    // DB関連のテストの順序は設定ファイルで管理
    // トランザクション整合性テストのために環境変数を設定
  },
  resolve: {
    alias: {
      '@test-utils': path.resolve(__dirname, '../helpers'),
      '@integration-utils': path.resolve(__dirname, '../integration/helpers'),
      '@api-tests': path.resolve(__dirname, '../integration/api'),
      '@db-tests': path.resolve(__dirname, '../integration/db'),
      '@mastra-tests': path.resolve(__dirname, '../integration/mastra'),
      '@test-db': path.resolve(__dirname, '../integration/db/test-container'),
    },
  },
});
