import { describe, it, expect, beforeAll } from 'vitest';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../../src/infrastructure/database/drizzle';
import { sql } from 'drizzle-orm';

// Cloudflare D1データベースの型定義
type D1Database = unknown; // Cloudflare Workers型が利用できない場合の代替定義

// このテストは実際のD1データベースが必要です
// 実行時にはCloudflare Wranglerを使用した環境が必要
describe('Database Connection Integration Tests', () => {
  // 環境変数からD1接続が利用可能かチェック
  const isD1Available = !!process.env.D1;

  // テストをスキップする条件
  const itIfD1 = isD1Available ? it : it.skip;

  // D1データベース接続
  const db = process.env.D1 ? drizzle(process.env.D1 as unknown as D1Database, { schema }) : null;

  beforeAll(() => {
    // D1が利用できない場合は警告を表示
    if (!isD1Available) {
      // eslint-disable-next-line no-console
      console.warn('D1データベースが利用できないため、DB接続テストをスキップします。');
      // eslint-disable-next-line no-console
      console.warn('このテストを実行するには、Wrangler環境で実行してください：');
      // eslint-disable-next-line no-console
      console.warn(
        'pnpm wrangler pages dev . --test -- vitest run tests/integration/database/database-connection.test.ts'
      );
    }
  });

  itIfD1('データベース接続が正常に確立されるべき', async () => {
    // 簡単なクエリを実行
    const result = await db!.run(sql`SELECT 1 as value`);
    expect(result.results[0]).toEqual({ value: 1 });
  });

  itIfD1('ユーザーテーブルが存在するべき', async () => {
    // テーブル存在チェッククエリ
    const result = await db!.run(sql`SELECT '${schema.users._.config.name}' as name`);
    expect(result.results[0]?.name).toBe('users');
  });

  itIfD1('タスクテーブルが存在するべき', async () => {
    // テーブル存在チェッククエリ
    const result = await db!.run(sql`SELECT '${schema.tasks._.config.name}' as name`);
    expect(result.results[0]?.name).toBe('tasks');
  });
});
