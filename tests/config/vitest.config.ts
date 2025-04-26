import { defineConfig, mergeConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import unitConfig from './vitest.unit';
import integrationConfig from './vitest.integration';
import e2eConfig from './vitest.e2e';
import performanceConfig from './vitest.performance';

// ベース設定
const baseConfig = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'src/**/*.d.ts',
        'src/types/**',
        '**/*.config.{js,ts}',
      ],
      lines: process.env.COVERAGE_PHASE === '3' ? 80 : process.env.COVERAGE_PHASE === '2' ? 70 : 60,
      functions:
        process.env.COVERAGE_PHASE === '3' ? 80 : process.env.COVERAGE_PHASE === '2' ? 70 : 60,
      branches:
        process.env.COVERAGE_PHASE === '3' ? 80 : process.env.COVERAGE_PHASE === '2' ? 70 : 60,
      statements:
        process.env.COVERAGE_PHASE === '3' ? 80 : process.env.COVERAGE_PHASE === '2' ? 70 : 60,
    },
  },
});

// テストタイプに基づいて設定を選択
export default (mode) => {
  switch (mode) {
    case 'unit':
      return mergeConfig(baseConfig, unitConfig);
    case 'integration':
      return mergeConfig(baseConfig, integrationConfig);
    case 'e2e':
      return mergeConfig(baseConfig, e2eConfig);
    case 'performance':
      return mergeConfig(baseConfig, performanceConfig);
    default:
      return baseConfig;
  }
};
