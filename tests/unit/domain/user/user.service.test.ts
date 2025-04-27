import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '@/domain/user/services';
import { UserRepository } from '@/domain/user/repositories';
import { User } from '@/domain/user/entities';
import { UserNotFoundError } from '@/domain/user/errors';

// モックリポジトリ
vi.mock('@/domain/user/repositories', () => {
  return {
    UserRepository: {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe('UserService', () => {
  // テストデータ
  const mockUser: User = {
    id: 'user_123',
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 各テスト前にモックをリセット
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getUserById', () => {
    it('正常にユーザーを取得できる場合', async () => {
      // モックの設定
      vi.mocked(UserRepository.findById).mockResolvedValue(mockUser);

      // テスト実行
      const result = await UserService.getUserById('user_123');

      // 検証
      expect(UserRepository.findById).toHaveBeenCalledWith('user_123');
      expect(result).toEqual(mockUser);
    });

    it('ユーザーが見つからない場合はエラーをスローする', async () => {
      // モックの設定
      vi.mocked(UserRepository.findById).mockResolvedValue(null);

      // テスト実行と検証
      await expect(UserService.getUserById('non_existent_id')).rejects.toThrow(UserNotFoundError);
      expect(UserRepository.findById).toHaveBeenCalledWith('non_existent_id');
    });

    it('ユーザーIDなしで検索した場合のエラーメッセージをテスト', async () => {
      // エラーインスタンスを直接作成してメッセージを検証
      const error = new UserNotFoundError();
      expect(error.message).toBe('ユーザーが見つかりません');
      expect(error.name).toBe('UserNotFoundError');
    });
  });

  describe('createUser', () => {
    it('正常にユーザーを作成できる場合', async () => {
      // 入力データ
      const userData = {
        name: 'New User',
        email: 'new@example.com',
      };

      const createdUser = { ...mockUser, ...userData };

      // モックの設定
      vi.mocked(UserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(UserRepository.create).mockResolvedValue(createdUser);

      // テスト実行
      const result = await UserService.createUser(userData);

      // 検証
      expect(UserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(UserRepository.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual(createdUser);
    });

    it('すでに同じメールアドレスのユーザーが存在する場合はエラーをスローする', async () => {
      // 入力データ
      const userData = {
        name: 'Duplicate User',
        email: 'test@example.com',
      };

      // モックの設定
      vi.mocked(UserRepository.findByEmail).mockResolvedValue(mockUser);

      // テスト実行と検証
      await expect(UserService.createUser(userData)).rejects.toThrow('ユーザーはすでに存在します');
      expect(UserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(UserRepository.create).not.toHaveBeenCalled();
    });
  });
});
