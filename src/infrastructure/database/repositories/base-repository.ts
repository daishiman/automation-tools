import { D1Database } from '@cloudflare/workers-types';
import { sql } from 'drizzle-orm';
import { getDbClient } from '../drizzle/client';
import { SQLiteTable, TableConfig } from 'drizzle-orm/sqlite-core';

/**
 * 汎用リポジトリ基底クラス
 * すべてのリポジトリの共通機能を提供
 */
export abstract class BaseRepository<T, TableType extends SQLiteTable<TableConfig>> {
  protected db: ReturnType<typeof getDbClient>;

  constructor(protected d1: D1Database) {
    this.db = getDbClient(d1);
  }

  /**
   * テーブル定義を提供する抽象メソッド
   * 継承先で実装する必要あり
   */
  protected abstract get table(): TableType;

  /**
   * IDによるレコード取得
   *
   * @param id レコードID
   * @returns 見つかったレコードまたはnull
   */
  async findById(id: string): Promise<T | null> {
    const result = await this.db
      .select()
      .from(this.table)
      .where(sql`${this.table}.id = ${id}`)
      .get();

    return result as T | null;
  }

  /**
   * 全レコード取得
   *
   * @returns レコードの配列
   */
  async findAll(): Promise<T[]> {
    const results = await this.db.select().from(this.table).all();
    return results as T[];
  }

  /**
   * レコード作成
   *
   * @param data 作成するデータ
   * @returns 作成されたレコード
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    // データベースに挿入するデータ
    // DrizzleはTypeScriptの型推論の制限により、このキャストが必要
    // データ構造は同じだが、型システム上の互換性のために行う
    const insertData = data as unknown as TableType['$inferInsert'];

    const result = await this.db.insert(this.table).values(insertData).returning().get();

    return result as T;
  }

  /**
   * レコード更新
   *
   * @param id 更新対象のID
   * @param data 更新データ
   * @returns 更新されたレコードまたはnull
   */
  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T | null> {
    const updated = {
      ...data,
      updatedAt: new Date(),
    };

    // データベースに更新するデータ
    // DrizzleはTypeScriptの型推論の制限により、このキャストが必要
    const updateData = updated as unknown as Partial<TableType['$inferInsert']>;

    const result = await this.db
      .update(this.table)
      .set(updateData)
      .where(sql`${this.table}.id = ${id}`)
      .returning()
      .get();

    return result as T | null;
  }

  /**
   * レコード削除
   *
   * @param id 削除対象のID
   * @returns 削除成功時true、失敗時false
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(this.table)
      .where(sql`${this.table}.id = ${id}`)
      .returning()
      .get();

    return !!result;
  }
}
