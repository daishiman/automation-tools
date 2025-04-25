import { User } from '../entities';

export const UserRepository = {
  findById: async (id: string): Promise<User | null> => {
    // 実際の実装はインフラストラクチャ層で行われる
    return null;
  },
  findByEmail: async (email: string): Promise<User | null> => {
    // 実際の実装はインフラストラクチャ層で行われる
    return null;
  },
  create: async (userData: { name: string; email: string }): Promise<User> => {
    // 実際の実装はインフラストラクチャ層で行われる
    return {
      id: '',
      name: userData.name,
      email: userData.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },
  update: async (id: string, userData: Partial<User>): Promise<User | null> => {
    // 実際の実装はインフラストラクチャ層で行われる
    return null;
  },
  delete: async (id: string): Promise<boolean> => {
    // 実際の実装はインフラストラクチャ層で行われる
    return false;
  },
};
