import { D1Database } from '@cloudflare/workers-types';
import { eq, and, desc, asc } from 'drizzle-orm';
import { BaseRepository } from '../base-repository';
import { tasks, Task, NewTask } from '../../drizzle/task/schema';

/**
 * タスク情報の永続化を担当するリポジトリ
 */
export class TaskRepository extends BaseRepository<Task, typeof tasks> {
  constructor(d1: D1Database) {
    super(d1);
  }

  /**
   * テーブル定義の取得
   */
  protected get table() {
    return tasks;
  }

  /**
   * ユーザーIDによるタスク検索
   *
   * @param userId ユーザーID
   * @returns タスクの配列
   */
  async findByUserId(userId: string): Promise<Task[]> {
    return await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.updatedAt))
      .all();
  }

  /**
   * ステータスによるタスク検索
   *
   * @param userId ユーザーID
   * @param status タスクステータス
   * @returns タスクの配列
   */
  async findByStatus(userId: string, status: Task['status']): Promise<Task[]> {
    return await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.status, status)))
      .orderBy(asc(tasks.priority), desc(tasks.updatedAt))
      .all();
  }

  /**
   * タスク作成の専用メソッド
   *
   * @param taskData タスクデータ
   * @returns 作成されたタスク
   */
  async createTask(taskData: Omit<NewTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    return await this.create({
      ...taskData,
      description: taskData.description === undefined ? null : taskData.description,
      status: taskData.status || 'todo',
      priority: taskData.priority ?? 0,
    });
  }

  /**
   * タスクステータスの更新
   *
   * @param id タスクID
   * @param status 新しいステータス
   * @returns 更新されたタスク
   */
  async updateStatus(id: string, status: Task['status']): Promise<Task | null> {
    return await this.update(id, { status });
  }
}
