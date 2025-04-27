import { eq, and, like } from 'drizzle-orm';
import { users, User } from '../../drizzle/user/schema';

/**
 * ユーザー検索用クエリビルダー
 * 複雑なクエリ条件を構築するためのユーティリティ
 */
export class UserQueryBuilder {
  /**
   * メールアドレスによるフィルター条件を構築
   *
   * @param email メールアドレス
   * @returns フィルター条件
   */
  static byEmail(email: string) {
    return eq(users.email, email);
  }

  /**
   * ロールによるフィルター条件を構築
   *
   * @param role ユーザーロール
   * @returns フィルター条件
   */
  static byRole(role: User['role']) {
    return eq(users.role, role);
  }

  /**
   * 名前の部分一致によるフィルター条件を構築
   *
   * @param name 名前（部分一致）
   * @returns フィルター条件
   */
  static nameContains(name: string) {
    return like(users.name, `%${name}%`);
  }
}
