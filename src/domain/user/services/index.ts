import { User } from '../entities';
import { UserRepository } from '../repositories';
import { UserNotFoundError } from '../errors';

export const UserService = {
  getUserById: async (id: string): Promise<User> => {
    const user = await UserRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  },

  createUser: async (userData: { name: string; email: string }): Promise<User> => {
    // 既存のユーザーを確認
    const existingUser = await UserRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('ユーザーはすでに存在します');
    }

    // 新しいユーザーを作成
    return UserRepository.create(userData);
  },
};
