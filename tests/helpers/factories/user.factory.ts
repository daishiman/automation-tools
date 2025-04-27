import { createId } from '@paralleldrive/cuid2';

// ドメインモデルのインターフェース（実際のプロジェクトでは@/domain/user/entitiesからインポート）
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserFactoryOptions {
  id?: string;
  name?: string;
  email?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * ユーザーエンティティのテストデータを生成するファクトリー
 */
export function createUserFactory(options: UserFactoryOptions = {}): User {
  const now = new Date();

  return {
    id: options.id || `user_${createId()}`,
    name: options.name || `Test User ${Math.floor(Math.random() * 1000)}`,
    email: options.email || `user${Math.floor(Math.random() * 10000)}@example.com`,
    createdAt: options.createdAt || now,
    updatedAt: options.updatedAt || now,
  };
}

/**
 * 複数のユーザーエンティティを生成
 */
export function createUserFactoryList(count: number, options: UserFactoryOptions = {}): User[] {
  return Array.from({ length: count }).map(() => createUserFactory(options));
}

/**
 * 管理者ユーザーを生成
 */
export function createAdminUserFactory(options: UserFactoryOptions = {}): User {
  return createUserFactory({
    ...options,
    name: options.name || `Admin User ${Math.floor(Math.random() * 100)}`,
    email: options.email || `admin${Math.floor(Math.random() * 1000)}@example.com`,
  });
}
