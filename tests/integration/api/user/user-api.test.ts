import { describe, it, expect, beforeAll, vi } from 'vitest';

// ベースURLの設定
const BASE_URL = 'http://localhost:3000';

// テスト用の関数（実際のAPIクライアントコードに置き換える）
const fetchUsers = async () => {
  const response = await fetch(`${BASE_URL}/api/users`);
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

const fetchUserById = async (id: string) => {
  const response = await fetch(`${BASE_URL}/api/users/${id}`);
  if (!response.ok) throw new Error(`Failed to fetch user with ID ${id}`);
  return response.json();
};

const createUser = async (userData: { name: string; email: string }) => {
  const response = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  if (!response.ok) throw new Error('Failed to create user');
  return response.json();
};

// モックデータと応答
const mockUsers = [
  { id: '1', name: 'User 1', email: 'user1@example.com' },
  { id: '2', name: 'User 2', email: 'user2@example.com' },
];

// fetchのモック実装
beforeAll(() => {
  // @ts-expect-error - グローバルfetchのモック化
  global.fetch = vi.fn((url: string, options?: RequestInit) => {
    // ユーザー一覧エンドポイント
    if (url === `${BASE_URL}/api/users` && (!options || options.method === 'GET')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUsers),
      } as Response);
    }

    // ユーザー取得エンドポイント（ID=1の場合）
    if (url === `${BASE_URL}/api/users/1` && (!options || options.method === 'GET')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUsers[0]),
      } as Response);
    }

    // 存在しないユーザーID
    if (url.match(`${BASE_URL}/api/users/999`) && (!options || options.method === 'GET')) {
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'User not found' }),
      } as Response);
    }

    // ユーザー作成エンドポイント
    if (url === `${BASE_URL}/api/users` && options?.method === 'POST') {
      const userData = JSON.parse(options.body as string);
      const newUser = {
        id: '3', // 新しいIDを割り当て
        ...userData,
      };
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(newUser),
      } as Response);
    }

    // デフォルトはエラーを返す
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ error: 'Endpoint not found' }),
    } as Response);
  });
});

describe('User API Integration Tests', () => {
  describe('fetchUsers', () => {
    it('ユーザー一覧を正常に取得できる', async () => {
      const users = await fetchUsers();
      expect(users).toEqual(mockUsers);
      expect(users.length).toBe(2);
    });
  });

  describe('fetchUserById', () => {
    it('特定のユーザーを正常に取得できる', async () => {
      const user = await fetchUserById('1');
      expect(user).toEqual(mockUsers[0]);
      expect(user.id).toBe('1');
    });

    it('存在しないユーザーIDの場合はエラーがスローされる', async () => {
      await expect(fetchUserById('999')).rejects.toThrow();
    });
  });

  describe('createUser', () => {
    it('ユーザーを正常に作成できる', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
      };
      const newUser = await createUser(userData);
      expect(newUser).toHaveProperty('id');
      expect(newUser.name).toBe(userData.name);
      expect(newUser.email).toBe(userData.email);
    });
  });
});
