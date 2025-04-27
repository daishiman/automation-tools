/**
 * 安全なパフォーマンスセットアップファイル
 * 問題を避けるために最小限の実装
 */
import { beforeAll, afterAll } from 'vitest';

// グローバル変数の初期化のみを行う最小限のセットアップ
beforeAll(() => {
  console.log('パフォーマンステスト開始');

  // グローバル変数を安全に設定
  if (!global.__PERF_METRICS__) {
    global.__PERF_METRICS__ = {
      startTime: Date.now(),
      endTime: 0,
      memory: {
        start: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 },
        end: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 },
      },
      metrics: {},
    };
  }
});

// 単純なクリーンアップ
afterAll(() => {
  console.log('パフォーマンステスト終了');
});
