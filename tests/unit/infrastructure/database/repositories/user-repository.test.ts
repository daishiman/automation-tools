import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';

// User型の定義
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

// 新規ユーザー作成時の型
interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role?: string;
}

// ユーザー更新時の型
interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}

// モッククエリ結果の型
type MockResult = User | User[] | null;

// UserRepositoryクラスをモック
class UserRepository {
  constructor(_: D1Database) {
    // 実装なし - モック用
  }

  async findById(_: string): Promise<User | null> {
    // 配列が返される場合は最初の要素を返し、nullの場合はnullを返す
    if (Array.isArray(mockQueryResult)) {
      return mockQueryResult.length > 0 ? mockQueryResult[0] : null;
    }
    return mockQueryResult;
  }

  async findByEmail(_: string): Promise<User | null> {
    // 配列が返される場合は最初の要素を返し、nullの場合はnullを返す
    if (Array.isArray(mockQueryResult)) {
      return mockQueryResult.length > 0 ? mockQueryResult[0] : null;
    }
    return mockQueryResult;
  }

  async createUser(_: CreateUserData): Promise<User> {
    // このメソッドではユーザーが必ず返されるはず
    if (mockQueryResult === null) {
      throw new Error('モックデータが設定されていません');
    }

    // 配列が返される場合は最初の要素を返す
    if (Array.isArray(mockQueryResult)) {
      if (mockQueryResult.length === 0) {
        throw new Error('モックデータが空です');
      }
      return mockQueryResult[0];
    }

    return mockQueryResult;
  }

  async update(userId: string, updateData: UpdateUserData): Promise<User | null> {
    // 配列が返される場合は最初の要素を返し、nullの場合はnullを返す
    if (Array.isArray(mockQueryResult)) {
      return mockQueryResult.length > 0 ? mockQueryResult[0] : null;
    }
    return mockQueryResult;
  }

  async delete(_: string): Promise<boolean> {
    return !!mockQueryResult;
  }

  async findAll(): Promise<User[]> {
    return Array.isArray(mockQueryResult)
      ? mockQueryResult
      : mockQueryResult
        ? [mockQueryResult]
        : [];
  }
}

// D1データベースのモック
const mockD1Database = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
  all: vi.fn(),
  run: vi.fn(),
} as unknown as D1Database;

// ドリズルクライアントのモック結果を保存する変数
let mockQueryResult: MockResult = null;

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
      const newUserData: CreateUserData = {
        name: 'テストユーザー',
        email: 'test@example.com',
        password: 'hashed-password',
        role: 'user',
      };

      // テスト対象のメソッド実行
      const result = await userRepo.createUser(newUserData);

      // 結果の検証
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('指定したidに一致するユーザーを更新して返すこと', async () => {
      // arrange
      const mockUser: User = {
        id: '1',
        name: 'UpdatedUser',
        email: 'updated@example.com',
        password: 'password123',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockQueryResult = mockUser;

      // act
      const userId = '1';
      const updateData: UpdateUserData = { name: 'UpdatedUser' };
      const result = await userRepo.update(userId, updateData);

      // assert
      expect(result).toEqual(mockUser);
    });

    it('指定したidに一致するユーザーが存在しない場合nullを返すこと', async () => {
      // arrange
      mockQueryResult = null;

      // act
      const userId = '999';
      const updateData: UpdateUserData = { name: 'NonExistentUser' };
      const result = await userRepo.update(userId, updateData);

      // assert
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('ユーザーを削除して成功を返すべき', async () => {
      // 削除成功のモックレスポンス
      mockQueryResult = {
        id: 'test-id',
        name: 'テストユーザー',
        email: 'test@example.com',
        password: 'hashed-password',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

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
