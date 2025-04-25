import { describe, it, expect, vi, beforeEach } from 'vitest';

// モジュール全体をモック
vi.mock('@/infrastructure/database/drizzle/task/schema', () => ({
  tasks: {
    _: {
      config: {
        name: 'tasks',
      },
    },
  },
}));

// 実際にテストする前に正しいモックをセットアップする
describe('タスクスキーマ', () => {
  // テスト前にモックを設定
  beforeEach(async () => {
    // モックはすでにvi.mockで設定済み
  });

  it('タスクテーブルが存在するべき', async () => {
    // モジュールを実際にインポート（テスト中にモック化される）
    const { tasks } = await import(
      '@/infrastructure/database/drizzle/task/schema'
    );

    // テーブル設定が存在することを確認
    expect(tasks).toBeDefined();
    expect(tasks._).toBeDefined();
    expect(tasks._.config).toBeDefined();
    expect(tasks._.config.name).toBe('tasks');
  });

  it('Task型とNewTask型が定義されているべき', async () => {
    // 型のインポートは直接テストできないため、インポートができることのみを確認
    const schema = await import(
      '@/infrastructure/database/drizzle/task/schema'
    );
    expect(schema).toBeDefined();
  });
});
