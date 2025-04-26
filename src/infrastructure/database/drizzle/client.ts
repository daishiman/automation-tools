import { drizzle } from 'drizzle-orm/d1';
import { D1Database } from '@cloudflare/workers-types';
import * as schema from './index';

let db: ReturnType<typeof drizzle> | null = null;

/**
 * D1データベースクライアントを取得する関数
 *
 * @param d1 Cloudflare D1データベースインスタンス
 * @returns Drizzle ORMクライアントインスタンス
 */
export function getDbClient(d1: D1Database) {
  if (!db) {
    db = drizzle(d1, { schema });
  }
  return db;
}
