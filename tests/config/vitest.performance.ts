import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'performance',
    include: ['../performance/**/*.test.{js,ts,tsx}', '../mastra-eval/**/*.test.{js,ts,tsx}'],
    exclude: ['../unit/**', '../integration/**', '../e2e/**'],
    setupFiles: ['../performance/helpers/setup.ts', '../mastra-eval/helpers/evals-setup.ts'],
    environment: 'node',
    reporters: ['default', 'html', 'json'],
    outputFile: {
      html: '../../reports/performance/index.html',
      json: '../../reports/performance/results.json',
    },
    testTimeout: 300000, // Mastra評価テストは非常に長時間かかる可能性がある
    // 逐次実行（リソース競合を避けるため）
    threads: false,
  },
  resolve: {
    alias: {
      '@test-utils': path.resolve(__dirname, '../helpers'),
      '@performance-utils': path.resolve(__dirname, '../performance/helpers'),
      '@metrics': path.resolve(__dirname, '../performance/metrics'),
      '@evals': path.resolve(__dirname, '../mastra-eval/evals'),
      '@mastra-metrics': path.resolve(__dirname, '../mastra-eval/metrics'),
      '@rag-tests': path.resolve(__dirname, '../mastra-eval/rag'),
      '@agent-tests': path.resolve(__dirname, '../mastra-eval/agents'),
    },
  },
});
