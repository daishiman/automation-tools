import { D1Database } from '@cloudflare/workers-types';
import { eq } from 'drizzle-orm';
import { BaseRepository } from '../base-repository';
import { users, User, NewUser } from '../../drizzle/user/schema';

/**
 * ユーザー情報の永続化を担当するリポジトリ
 */
export class UserRepository extends BaseRepository<User, typeof users> {
  constructor(d1: D1Database) {
    super(d1);
  }

  /**
   * テーブル定義の取得
   */
  protected get table() {
    return users;
  }

  /**
   * メールアドレスによるユーザー検索
   *
   * @param email メールアドレス
   * @returns 見つかったユーザーまたはnull
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).get();

    return result || null;
  }

  /**
   * ユーザー作成の専用メソッド
   *
   * @param userData ユーザーデータ
   * @returns 作成されたユーザー
   */
  async createUser(userData: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return await this.create({
      ...userData,
      role: userData.role || 'user',
    });
  }
}
