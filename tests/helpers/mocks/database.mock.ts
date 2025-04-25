import { vi } from 'vitest';
import { D1Database } from '@cloudflare/workers-types';

/**
 * D1データベースのモック
 * テスト用のモックD1インスタンスを生成
 */
export function createMockD1Database(): D1Database {
  return {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
    batch: vi.fn(),
    exec: vi.fn(),
  } as unknown as D1Database;
}

/**
 * Drizzleクエリビルダーのモック
 * getDbClientの戻り値をモック
 */
export function createMockDrizzleClient() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    get: vi.fn(),
    all: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  };
}

/**
 * getDbClientのモック
 * @param mockResultGetter モック結果を返す関数（テスト内で動的に変更できるようにする）
 */
export function mockGetDbClient(mockResultGetter: () => unknown) {
  const mockClient = createMockDrizzleClient();

  // getとallメソッドの実装をオーバーライド
  mockClient.get.mockImplementation(() => mockResultGetter());
  mockClient.all.mockImplementation(() => {
    const result = mockResultGetter();
    return Array.isArray(result) ? result : [];
  });

  return vi.fn().mockReturnValue(mockClient);
}
