import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import { server } from '../mocks/server';

// MSWモックサーバーを起動
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// 各テスト後にハンドラーをリセット
afterEach(() => server.resetHandlers());

// テスト終了後にサーバーをクローズ
afterAll(() => server.close());

// データベースのモック
vi.mock('@/infrastructure/database/drizzle', () => {
  return {
    db: {
      query: vi.fn(),
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

// KVストアのモック
vi.mock('@/infrastructure/storage/kv', () => {
  const mockKV = {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  };

  return {
    kv: mockKV,
    getKV: () => mockKV,
  };
});

// 環境変数のセットアップ
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api';
