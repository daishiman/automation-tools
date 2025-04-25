import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRepository } from '@/infrastructure/database/repositories/user';
import { User } from '@/infrastructure/database/drizzle/user/schema';
import type { D1Database } from '@cloudflare/workers-types';
// 使用していないのでインポートを削除
// import { eq } from 'drizzle-orm';

// D1データベースのモック
const mockD1Database = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
  all: vi.fn(),
  run: vi.fn(),
} as unknown as D1Database; // anyの代わりにunknownとD1Databaseを使用

// ドリズルクライアントのモック結果を保存する変数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockQueryResult: any = null; // ESLintを無効化するコメントを追加

// getDbClientのモック
vi.mock('@/infrastructure/database/drizzle/client', () => ({
  getDbClient: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    get: vi.fn().mockImplementation(() => mockQueryResult),
    all: vi.fn().mockImplementation(() => (Array.isArray(mockQueryResult) ? mockQueryResult : [])),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }),
}));

describe('UserRepository', () => {
  let userRepo: UserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    userRepo = new UserRepository(mockD1Database);
    mockQueryResult = null;
  });

  describe('findById', () => {
    it('指定したIDのユーザーを返すべき', async () => {
      // モック結果のセットアップ
      const mockUser: User = {
        id: 'test-id',
        name: 'テストユーザー',
        email: 'test@example.com',
        password: 'hashed-password',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockQueryResult = mockUser;

      // テスト対象のメソッド実行
      const result = await userRepo.findById('test-id');

      // 結果の検証
      expect(result).toEqual(mockUser);
    });

    it('ユーザーが見つからない場合はnullを返すべき', async () => {
      // モック結果をnullに設定
      mockQueryResult = null;

      // テスト対象のメソッド実行
      const result = await userRepo.findById('non-existent-id');

      // 結果の検証
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('指定したメールアドレスのユーザーを返すべき', async () => {
      // モック結果のセットアップ
      const mockUser: User = {
        id: 'test-id',
        name: 'テストユーザー',
        email: 'test@example.com',
        password: 'hashed-password',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockQueryResult = mockUser;

      // テスト対象のメソッド実行
      const result = await userRepo.findByEmail('test@example.com');

      // 結果の検証
      expect(result).toEqual(mockUser);
    });
  });

  describe('createUser', () => {
    it('新しいユーザーを作成して返すべき', async () => {
      // モック結果のセットアップ
      const mockUser: User = {
        id: 'generated-id',
        name: 'テストユーザー',
        email: 'test@example.com',
        password: 'hashed-password',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockQueryResult = mockUser;

      // 新規ユーザーデータ
      const newUserData = {
        name: 'テストユーザー',
        email: 'test@example.com',
        password: 'hashed-password',
        role: 'user' as const,
      };

      // テスト対象のメソッド実行
      const result = await userRepo.createUser(newUserData);

      // 結果の検証
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('ユーザー情報を更新して返すべき', async () => {
      // モック結果のセットアップ
      const updatedUser: User = {
        id: 'test-id',
        name: '更新後ユーザー',
        email: 'updated@example.com',
        password: 'hashed-password',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockQueryResult = updatedUser;

      // 更新データ
      const updateData = {
        name: '更新後ユーザー',
        email: 'updated@example.com',
        role: 'admin' as const,
      };

      // テスト対象のメソッド実行
      const result = await userRepo.update('test-id', updateData);

      // 結果の検証
      expect(result).toEqual(updatedUser);
    });

    it('更新対象のユーザーが見つからない場合はnullを返すべき', async () => {
      // モック結果をnullに設定
      mockQueryResult = null;

      // 更新データ
      const updateData = {
        name: '更新後ユーザー',
        email: 'updated@example.com',
      };

      // テスト対象のメソッド実行
      const result = await userRepo.update('non-existent-id', updateData);

      // 結果の検証
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('ユーザーを削除して成功を返すべき', async () => {
      // 削除成功のモックレスポンス
      mockQueryResult = { id: 'test-id' };

      // テスト対象のメソッド実行
      const result = await userRepo.delete('test-id');

      // 結果の検証
      expect(result).toBe(true);
    });

    it('削除対象のユーザーが見つからない場合はfalseを返すべき', async () => {
      // モック結果をnullに設定
      mockQueryResult = null;

      // テスト対象のメソッド実行
      const result = await userRepo.delete('non-existent-id');

      // 結果の検証
      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    it('すべてのユーザーを返すべき', async () => {
      // モック結果のセットアップ
      const mockUsers: User[] = [
        {
          id: 'user-1',
          name: 'ユーザー1',
          email: 'user1@example.com',
          password: 'hashed-password-1',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user-2',
          name: 'ユーザー2',
          email: 'user2@example.com',
          password: 'hashed-password-2',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockQueryResult = mockUsers;

      // テスト対象のメソッド実行
      const result = await userRepo.findAll();

      // 結果の検証
      expect(result).toEqual(mockUsers);
    });

    it('ユーザーが存在しない場合は空配列を返すべき', async () => {
      // モック結果を空配列に設定
      mockQueryResult = [];

      // テスト対象のメソッド実行
      const result = await userRepo.findAll();

      // 結果の検証
      expect(result).toEqual([]);
    });
  });
});
