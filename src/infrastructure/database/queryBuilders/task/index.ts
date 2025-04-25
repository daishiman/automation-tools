import { eq, and, like, gt, lt, between } from 'drizzle-orm';
import { tasks, Task } from '../../drizzle/task/schema';

/**
 * タスク検索用クエリビルダー
 * 複雑なクエリ条件を構築するためのユーティリティ
 */
export class TaskQueryBuilder {
  /**
   * ユーザーIDによるフィルター条件を構築
   *
   * @param userId ユーザーID
   * @returns フィルター条件
   */
  static byUserId(userId: string) {
    return eq(tasks.userId, userId);
  }

  /**
   * ステータスによるフィルター条件を構築
   *
   * @param status タスクステータス
   * @returns フィルター条件
   */
  static byStatus(status: Task['status']) {
    return eq(tasks.status, status);
  }

  /**
   * タイトルの部分一致によるフィルター条件を構築
   *
   * @param title タイトル（部分一致）
   * @returns フィルター条件
   */
  static titleContains(title: string) {
    return like(tasks.title, `%${title}%`);
  }

  /**
   * 優先度によるフィルター条件を構築
   *
   * @param min 最小優先度
   * @param max 最大優先度
   * @returns フィルター条件
   */
  static byPriorityRange(min: number, max: number) {
    return between(tasks.priority, min, max);
  }
}
