// グローバルなVitestセットアップファイル
import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// グローバル設定
if (typeof global !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as { BASE_URL?: string }).BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
}

// テスト環境セットアップ
beforeAll(() => {
  // eslint-disable-next-line no-console
  console.log('グローバルテストセットアップを開始');
});

afterAll(() => {
  // eslint-disable-next-line no-console
  console.log('グローバルテストクリーンアップを実行');
});

afterEach(() => {
  // 各テスト後のクリーンアップ
  vi.resetAllMocks();
});
