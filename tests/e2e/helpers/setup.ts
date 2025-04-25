import { beforeAll, afterAll, vi } from 'vitest';

// E2Eテスト環境変数のセットアップ
process.env.NEXT_PUBLIC_E2E_TEST = 'true';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api';

// テスト開始前の処理
beforeAll(async () => {
  // E2Eテスト用のブラウザを起動する場合の設定など
  // eslint-disable-next-line no-console
  console.log('E2E tests started');
});

// テスト終了後の処理
afterAll(async () => {
  // リソースのクリーンアップ
  // eslint-disable-next-line no-console
  console.log('E2E tests completed');
});

// ヘッドレスブラウザのモック（実際のE2Eテストでは不要）
vi.mock('playwright', () => {
  return {
    chromium: {
      launch: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn(),
          click: vi.fn(),
          fill: vi.fn(),
          waitForSelector: vi.fn(),
          close: vi.fn(),
        }),
        close: vi.fn(),
      }),
    },
  };
});
