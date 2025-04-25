import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['./no-setup-test.ts'],
    setupFiles: [], // セットアップファイルを使用しない
    environment: 'node',
    testTimeout: 10000, // 10秒のタイムアウト
    reporters: ['default'],
    threads: false,
  },
});
