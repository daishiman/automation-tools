import { vi } from 'vitest';

/**
 * データベースモックファクトリー
 * テスト中に使用するデータベース操作のモックを提供します。
 */
export const createMockDatabase = () => {
  // 基本的なデータベース操作のモック
  const dbMock = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    get: vi.fn(),
    all: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(function (this: ReturnType<typeof createMockDatabase>) {
      return this;
    }),
    run: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    prepare: vi.fn().mockReturnThis(),
    execute: vi.fn(),
    inTransaction: vi.fn(),
  };

  // トランザクション用のモック
  const txMock = {
    ...dbMock,
    commit: vi.fn(),
    rollback: vi.fn(),
  };

  // inTransactionの実装
  dbMock.inTransaction.mockImplementation(async (callback) => {
    try {
      const result = await callback(txMock);
      txMock.commit();
      return result;
    } catch (error) {
      txMock.rollback();
      throw error;
    }
  });

  return dbMock;
};

/**
 * レポジトリモックファクトリー
 * モックリポジトリを提供します。
 */
export const createMockRepository = () => {
  return {
    findById: vi.fn(),
    findByField: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    // よく使われるメソッドを追加
    findByEmail: vi.fn(),
    findByUserId: vi.fn(),
  };
};

/**
 * クエリビルダーモックファクトリー
 * モッククエリビルダーを提供します。
 */
export const createMockQueryBuilder = () => {
  return {
    buildSelectQuery: vi.fn(),
    buildInsertQuery: vi.fn(),
    buildUpdateQuery: vi.fn(),
    buildDeleteQuery: vi.fn(),
    buildPaginationQuery: vi.fn(),
    buildFilterQuery: vi.fn(),
  };
};
