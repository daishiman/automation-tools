import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: false, // グローバル変数を使用しない
    environment: 'node', // ブラウザ環境ではなくNode環境で実行
    include: ['./mastra-generate.test.ts'],
    setupFiles: [], // セットアップファイルを使用しない
    isolate: true, // テストファイルを分離して実行
    threads: false, // スレッドを使用しない
    testTimeout: 30000, // 30秒のタイムアウトを設定
    maxThreads: 1, // 最大スレッド数を1に制限
    minThreads: 1, // 最小スレッド数を1に設定
    silent: false, // すべてのログを表示
    bail: 1, // 1つのテストが失敗したら終了
    reporters: ['default', 'verbose'],
    onConsoleLog(log) {
      console.log(`[Log] ${log}`);
      return false; // すべてのログを表示
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
      '@test-utils': path.resolve(__dirname, '../helpers'),
    },
  },
});
