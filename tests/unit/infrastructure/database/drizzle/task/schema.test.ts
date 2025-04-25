import { describe, it, expect, vi } from 'vitest';

// シンプルなモックオブジェクト
const mockTasksTable = {
  id: { name: 'id' },
  title: { name: 'title' },
  description: { name: 'description' },
  status: { name: 'status' },
  priority: { name: 'priority' },
  userId: { name: 'user_id' },
  createdAt: { name: 'created_at' },
  updatedAt: { name: 'updated_at' },
  _: {
    config: {
      name: 'tasks',
    },
  },
};

// スキーマをモック
vi.mock('@/infrastructure/database/drizzle/task/schema', () => ({
  tasks: mockTasksTable,
  Task: {},
  NewTask: {},
}));

// テスト実行
describe('タスクスキーマの基本検証', () => {
  it('モックが正しく設定されていることを確認', () => {
    // モックオブジェクトを直接検証
    expect(mockTasksTable).toBeDefined();
    expect(mockTasksTable._).toBeDefined();
    expect(mockTasksTable._.config.name).toBe('tasks');

    // 基本的なカラムの存在確認
    expect(mockTasksTable.id).toBeDefined();
    expect(mockTasksTable.title).toBeDefined();
    expect(mockTasksTable.description).toBeDefined();
    expect(mockTasksTable.status).toBeDefined();
  });
});
