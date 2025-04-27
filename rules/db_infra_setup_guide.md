# DB・インフラ設定・接続詳細ガイド (v1.0.0)

このドキュメントでは、プロジェクトのデータベース設定とインフラストラクチャの接続に関する詳細な手順を説明します。100人のエンジニアが同じように再現できるよう、具体的かつ明確な手順を提供します。

> **注意**: 本ガイドは2023年12月時点の情報に基づいて作成されています。

## 目次

1. [前提条件](#1-前提条件)
2. [Cloudflareリソースのセットアップ](#2-cloudflareリソースのセットアップ)
3. [データベーススキーマ定義](#3-データベーススキーマ定義)
4. [データベースマイグレーション](#4-データベースマイグレーション)
5. [リポジトリパターン実装](#5-リポジトリパターン実装)
6. [環境変数の設定](#6-環境変数の設定)
7. [データベース接続テスト](#7-データベース接続テスト)
8. [初期データの投入](#8-初期データの投入)
9. [本番環境デプロイ設定](#9-本番環境デプロイ設定)
10. [トラブルシューティング](#10-トラブルシューティング)

## 1. 前提条件

データベースとインフラ設定を進める前に、以下の前提条件を満たしていることを確認してください。

### 必要なツールとアカウント

| ツール/アカウント    | 必要バージョン | 確認方法                                                | インストール方法                                    |
| -------------------- | -------------- | ------------------------------------------------------- | --------------------------------------------------- |
| Node.js              | v20.10.0以上   | `node -v`                                               | [公式サイト](https://nodejs.org/) または nvm        |
| pnpm                 | v8.10.0以上    | `pnpm -v`                                               | `pnpm install -g pnpm`                              |
| wrangler CLI         | v3.15.0以上    | `wrangler -v`                                           | `pnpm add -g wrangler`                              |
| Cloudflareアカウント | -              | [dashboard.cloudflare.com](https://dash.cloudflare.com) | [サインアップ](https://dash.cloudflare.com/sign-up) |

### 確認手順

```bash
# Node.jsのバージョン確認
node -v  # v20.10.0以上が表示されること

# pnpmのインストールと確認
pnpm install -g pnpm@latest
pnpm -v  # 8.10.0以上が表示されること

# wranglerのインストール
pnpm add -g wrangler@latest
wrangler -v  # 3.15.0以上が表示されること

# Cloudflareアカウントへのログイン
wrangler login
# ブラウザが開き、認証を求められます
# 認証完了後「You have successfully logged in.」と表示されることを確認
```

### プロジェクト準備状況の確認

- リポジトリがクローンされていること
- 基本的な開発環境が設定されていること
- Next.jsプロジェクトの初期化が完了していること

前提条件が満たされていない場合は、先に[初期設定ガイド](./initial_setup_guide.md)の手順を完了させてください。

## 2. Cloudflareリソースのセットアップ

Cloudflareプラットフォーム上で必要なリソースをセットアップします。

### D1データベースの作成

D1はCloudflareのサーバーレスSQLデータベースで、Workersから直接アクセスできます。

```bash
# D1データベースの作成
wrangler d1 create automationa-tools-db

# 出力例:
# Created database 'automationa-tools-db' (xxxx-xxxx-xxxx-xxxx)
# [[d1_databases]]
# binding = "DB"
# database_name = "automationa-tools-db"
# database_id = "xxxx-xxxx-xxxx-xxxx"

# ⚠️ 重要: この出力からdatabase_idをメモしておく
# 例: D1_DATABASE_ID=xxxx-xxxx-xxxx-xxxx
```

### KVネームスペースの作成

KVはCloudflareのキーバリューストアで、高速な読み取りアクセスに適しています。

```bash
# KVネームスペースの作成
wrangler kv:namespace create automationa-tools-cache

# 出力例:
# Add the following to your configuration file:
# [[kv_namespaces]]
# binding = "automationa-tools-cache"
# id = "xxxx-xxxx-xxxx-xxxx"

# ⚠️ 重要: この出力からidをメモしておく
# 例: KV_NAMESPACE_ID=xxxx-xxxx-xxxx-xxxx
```

### R2バケットの作成

R2はCloudflareのオブジェクトストレージで、S3互換のAPIを提供します。

```bash
# R2バケットの作成
wrangler r2 bucket create automationa-tools-storage

# 出力例:
# Created bucket 'automationa-tools-storage'
# Add the following to your wrangler.toml file:
# [[r2_buckets]]
# binding = "STORAGE"
# bucket_name = "automationa-tools-storage"
```

### wrangler.tomlの設定

作成したリソースを参照するための設定ファイルを作成します。

```bash
# wrangler.tomlファイルの作成
cat > wrangler.toml << EOL
name = "automationa-tools-application"
compatibility_date = "2023-12-01"
main = "src/worker.ts"

# D1データベース設定
[[d1_databases]]
binding = "DB"
database_name = "automationa-tools-db"
database_id = "${D1_DATABASE_ID}"  # 先ほどメモしたIDに置き換える

# KV設定
[[kv_namespaces]]
binding = "KV_CACHE"
id = "${KV_NAMESPACE_ID}"  # 先ほどメモしたIDに置き換える

# R2バケット設定
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "automationa-tools-storage"

# 環境変数設定
[vars]
ENVIRONMENT = "production"

# 開発環境向け
[env.development]
workers_dev = true
[env.development.vars]
ENVIRONMENT = "development"

# ステージング環境向け
[env.staging]
[env.staging.vars]
ENVIRONMENT = "staging"
EOL
```

> ⚠️ **重要**: `${D1_DATABASE_ID}`と`${KV_NAMESPACE_ID}`を、先ほどメモした実際のIDに必ず置き換えてください。

### リソース設定の確認

```bash
# D1接続テスト
wrangler d1 execute automationa-tools-db --command "SELECT 1+1 as result"
# 出力例: { result: 2 }

# KV動作テスト
wrangler kv key put --namespace-id=automationa-tools-cache "test-key" "test-value"
# 出力例: test-value

# ファイル構成確認
ls -la
# wrangler.tomlが存在することを確認
```

## 3. データベーススキーマ定義

Drizzle ORMを使用してデータベーススキーマを定義します。

### ディレクトリ構造の作成

```bash
# ディレクトリ構造の作成 - 機能別ディレクトリを作成
mkdir -p src/infrastructure/database/drizzle/[feature]
mkdir -p src/infrastructure/database/repositories/[feature]
mkdir -p src/infrastructure/database/queryBuilders/[feature]

# 実装例として、user機能とtask機能のディレクトリを作成
mkdir -p src/infrastructure/database/drizzle/user
mkdir -p src/infrastructure/database/drizzle/task
mkdir -p src/infrastructure/database/repositories/user
mkdir -p src/infrastructure/database/repositories/task
mkdir -p src/infrastructure/database/queryBuilders/user
mkdir -p src/infrastructure/database/queryBuilders/task
```

### スキーマファイルの作成

#### ユーザースキーマ

```bash
# ユーザースキーマの作成
cat > src/infrastructure/database/drizzle/user/schema.ts << 'EOL'
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(),
  role: text('role', { enum: ['user', 'admin'] }).default('user').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
});

// 型定義
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
EOL
```

#### タスクスキーマ

```bash
# タスクスキーマの作成
cat > src/infrastructure/database/drizzle/task/schema.ts << 'EOL'
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';
import { users } from '../user/schema';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['todo', 'in_progress', 'done'] }).default('todo').notNull(),
  priority: integer('priority').default(0).notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
});

// 型定義
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
EOL
```

#### インデックスファイル

```bash
# インデックスファイルの作成
cat > src/infrastructure/database/drizzle/index.ts << 'EOL'
export * from './user/schema';
export * from './task/schema';
EOL

# 依存パッケージのインストール
pnpm add @paralleldrive/cuid2
```

### クライアント設定ファイルの作成

```bash
# クライアント設定ファイルを作成
cat > src/infrastructure/database/drizzle/client.ts << 'EOL'
import { drizzle } from 'drizzle-orm/d1';
import { D1Database } from '@cloudflare/workers-types';
import * as schema from './index';

/**
 * D1データベースクライアントを取得する関数
 *
 * @param d1 Cloudflare D1データベースインスタンス
 * @returns Drizzle ORMクライアントインスタンス
 */
export function getDbClient(d1: D1Database) {
  return drizzle(d1, { schema });
}
EOL

# D1型定義の依存関係をインストール
pnpm add -D @cloudflare/workers-types
```

## 4. データベースマイグレーション

データベースのスキーマ変更を管理するためのマイグレーション設定を行います。

### Drizzle設定ファイルの作成

```bash
# drizzle.config.tsファイルを作成
cat > drizzle.config.ts << 'EOL'
import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

export default defineConfig({
  schema: './src/infrastructure/database/drizzle/**/schema.ts',
  out: './drizzle',
  driver: 'd1',
  dbCredentials: {
    wranglerConfigPath: './wrangler.toml',
    dbName: 'DB',
  },
  verbose: true,
  strict: true,
});
EOL

# dotenvの依存関係をインストール
pnpm add -D dotenv
```

### マイグレーションの生成

```bash
# マイグレーションを生成
pnpm drizzle-kit generate

# 出力例:
# Generating migration for D1 driver
# Including following files into migration:
# - ./src/infrastructure/database/drizzle/schema/users.ts
# - ./src/infrastructure/database/drizzle/schema/tasks.ts
#
# Migration generated at: drizzle/0000_initial.sql 🚀

# マイグレーションファイルの確認
cat drizzle/0000_initial.sql
# SQLファイルの内容が表示される
```

### マイグレーションの適用

```bash
# マイグレーションをD1データベースに適用
pnpm wrangler d1 execute automationa-tools-db --file=./drizzle/0000_initial.sql

# 成功メッセージが表示されることを確認
# 例: Successfully executed X commands from ./drizzle/0000_initial.sql on automationa-tools-db.
```

### マイグレーションの自動化スクリプト

```bash
# マイグレーションスクリプトを作成
mkdir -p scripts
cat > scripts/migrate.js << 'EOL'
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// マイグレーションディレクトリのパス
const MIGRATIONS_DIR = path.resolve(__dirname, '../drizzle');

// データベース名
const DB_NAME = 'automationa-tools-db';

// すべてのSQLファイルを取得して昇順にソート
const sqlFiles = fs.readdirSync(MIGRATIONS_DIR)
  .filter(file => file.endsWith('.sql'))
  .sort();

if (sqlFiles.length === 0) {
  console.error('❌ マイグレーションファイルが見つかりません。まず `pnpm drizzle-kit generate` を実行してください。');
  process.exit(1);
}

console.log(`🔍 ${sqlFiles.length}個のマイグレーションファイルを実行します...`);

// 各マイグレーションファイルを実行
for (const file of sqlFiles) {
  const filePath = path.join(MIGRATIONS_DIR, file);
  console.log(`⚙️ マイグレーションを実行中: ${file}`);

  try {
    // wranglerコマンドを実行
    execSync(`pnpm wrangler d1 execute ${DB_NAME} --file=${filePath}`, {
      stdio: 'inherit'
    });
    console.log(`✅ マイグレーション成功: ${file}`);
  } catch (error) {
    console.error(`❌ マイグレーション失敗: ${file}`);
    console.error(error.message);
    process.exit(1);
  }
}

console.log('🎉 すべてのマイグレーションが正常に実行されました！');
EOL

# package.jsonにマイグレーションスクリプトを追加（package.jsonを編集）
# スクリプト部分に以下を追加:
# "db:generate": "drizzle-kit generate",
# "db:migrate": "node scripts/migrate.js",
# "db:studio": "drizzle-kit studio"
```

## 5. リポジトリパターン実装

データベースアクセスを抽象化するリポジトリパターンを実装します。

### リポジトリ基底クラスの作成

```bash
# リポジトリディレクトリに基底クラスを作成
cat > src/infrastructure/database/repositories/base-repository.ts << 'EOL'
import { D1Database } from '@cloudflare/workers-types';
import { eq } from 'drizzle-orm';
import { getDbClient } from '../drizzle/client';
import { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core';

/**
 * 汎用リポジトリ基底クラス
 * すべてのリポジトリの共通機能を提供
 */
export abstract class BaseRepository<T, TableType extends SQLiteTableWithColumns<{
  name: string;
  schema: string;
  columns: Record<string, unknown>;
}>> {
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
      .where(eq(this.table.id, id))
      .get();

    return result || null;
  }

  /**
   * 全レコード取得
   *
   * @returns レコードの配列
   */
  async findAll(): Promise<T[]> {
    return await this.db
      .select()
      .from(this.table)
      .all();
  }

  /**
   * レコード作成
   *
   * @param data 作成するデータ
   * @returns 作成されたレコード
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const result = await this.db
      .insert(this.table)
      .values(data as unknown as Record<string, unknown>)
      .returning()
      .get();

    return result;
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

    const result = await this.db
      .update(this.table)
      .set(updated as unknown as Record<string, unknown>)
      .where(eq(this.table.id, id))
      .returning()
      .get();

    return result || null;
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
      .where(eq(this.table.id, id))
      .returning()
      .get();

    return !!result;
  }
}
EOL
```

### 機能別リポジトリの実装

リポジトリクラスは機能([feature])ごとに実装します。以下はユーザー機能とタスク機能の実装例です。

#### ユーザーリポジトリの実装例

```bash
# ユーザーリポジトリの実装
cat > src/infrastructure/database/repositories/user/index.ts << 'EOL'
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
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    return result || null;
  }

  /**
   * ユーザー作成の専用メソッド
   *
   * @param userData ユーザーデータ
   * @returns 作成されたユーザー
   */
  async createUser(userData: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return await this.create(userData);
  }
}
EOL
```

#### タスクリポジトリの実装例

```bash
# タスクリポジトリの実装
cat > src/infrastructure/database/repositories/task/index.ts << 'EOL'
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
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, status)
        )
      )
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
    return await this.create(taskData);
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
EOL
```

### リポジトリのインデックスファイル作成

```bash
# リポジトリのインデックスファイル作成
cat > src/infrastructure/database/repositories/index.ts << 'EOL'
export * from './user';
export * from './task';
EOL

# 不足している依存関係をインストール
pnpm add drizzle-orm@0.29.0
```

### 機能別クエリビルダーの実装

クエリビルダーも機能([feature])ごとに実装します。以下はユーザー機能とタスク機能の実装例です。

#### ユーザークエリビルダーの実装例

```bash
# ユーザークエリビルダーの実装
cat > src/infrastructure/database/queryBuilders/user/index.ts << 'EOL'
import { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core';
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
EOL
```

#### タスククエリビルダーの実装例

```bash
# タスククエリビルダーの実装
cat > src/infrastructure/database/queryBuilders/task/index.ts << 'EOL'
import { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core';
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
EOL
```

### クエリビルダーのインデックスファイル作成

```bash
# クエリビルダーのインデックスファイル作成
cat > src/infrastructure/database/queryBuilders/index.ts << 'EOL'
export * from './user';
export * from './task';
EOL
```

## 6. 環境変数の設定

アプリケーションで必要な環境変数を設定します。

### 環境変数ファイルの作成

```bash
# .env.exampleファイルの作成
cat > .env.example << 'EOL'
# アプリケーション
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=/api

# Cloudflare - 実際の値に置き換える必要あり
CF_ACCOUNT_ID=your_cloudflare_account_id
CF_API_TOKEN=your_cloudflare_api_token

# データベース - 実際の値に置き換える必要あり
D1_DATABASE_ID=your_d1_database_id
KV_NAMESPACE_ID=your_kv_namespace_id
R2_BUCKET_NAME=automationa-tools-storage

# 認証 - 実際の値に置き換える必要あり
AUTH_SECRET=your_auth_secret_min_32_chars
JWT_SECRET=your_jwt_secret_min_32_chars
EOL

# .env.localファイルの作成（実際の値に置き換える必要あり）
cat > .env.local << 'EOL'
# アプリケーション
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=/api

# Cloudflare - 実際の値で置き換えてください
CF_ACCOUNT_ID=your_cloudflare_account_id
CF_API_TOKEN=your_cloudflare_api_token

# データベース - 実際の値で置き換えてください
D1_DATABASE_ID=your_d1_database_id
KV_NAMESPACE_ID=your_kv_namespace_id
R2_BUCKET_NAME=automationa-tools-storage

# 認証 - 安全なランダム値を生成（以下はサンプルです。必ず置き換えてください）
AUTH_SECRET=b9e74d7c8f3a6e2516b5d7a9f0c1e8a7d6b3c9e0
JWT_SECRET=c7a4e9d0b3f2a5c1e8a7d6b3c9e0f8a5d1b6c3e7
EOL
```

> ⚠️ **重要**: `.env.local`ファイルには実際の値を設定し、Gitには絶対にコミットしないでください。

### 環境変数ユーティリティの作成

```bash
# 環境変数ユーティリティの作成
mkdir -p src/lib/config
cat > src/lib/config/env.ts << 'EOL'
/**
 * 環境変数を安全に取得するユーティリティ
 * 必須環境変数が存在しない場合はエラーをスロー
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;

  if (value === undefined) {
    throw new Error(`必須環境変数 "${key}" が設定されていません。`);
  }

  return value;
}

/**
 * 環境変数のブール値を取得
 */
export function getBoolEnv(key: string, defaultValue = false): boolean {
  const value = process.env[key];

  if (value === undefined) {
    return defaultValue;
  }

  return value === '1' || value === 'true' || value === 'yes';
}

/**
 * 環境変数の数値を取得
 */
export function getNumEnv(key: string, defaultValue?: number): number {
  const value = process.env[key];

  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`必須環境変数 "${key}" が設定されていません。`);
    }
    return defaultValue;
  }

  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`環境変数 "${key}" が数値ではありません: ${value}`);
  }

  return num;
}

/**
 * アプリケーション環境変数を集約
 */
export const env = {
  // アプリケーション
  appUrl: getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  apiBaseUrl: getEnv('NEXT_PUBLIC_API_BASE_URL', '/api'),
  nodeEnv: getEnv('NODE_ENV', 'development'),
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // Cloudflare
  cfAccountId: getEnv('CF_ACCOUNT_ID', ''),
  cfApiToken: getEnv('CF_API_TOKEN', ''),

  // データベース
  d1DatabaseId: getEnv('D1_DATABASE_ID', ''),
  kvNamespaceId: getEnv('KV_NAMESPACE_ID', ''),
  r2BucketName: getEnv('R2_BUCKET_NAME', 'automationa-tools-storage'),

  // 認証
  authSecret: getEnv('AUTH_SECRET', ''),
  jwtSecret: getEnv('JWT_SECRET', ''),
};
EOL
```

### 環境変数の型定義

```bash
# 環境変数の型定義
mkdir -p src/types
cat > src/types/env.d.ts << 'EOL'
import { D1Database } from '@cloudflare/workers-types';

// 環境変数の型定義
declare namespace NodeJS {
  interface ProcessEnv {
    // アプリケーション
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_API_BASE_URL: string;
    NODE_ENV: 'development' | 'production' | 'test';

    // Cloudflare
    CF_ACCOUNT_ID?: string;
    CF_API_TOKEN?: string;

    // データベース
    D1_DATABASE_ID?: string;
    KV_NAMESPACE_ID?: string;
    R2_BUCKET_NAME?: string;

    // 認証
    AUTH_SECRET: string;
    JWT_SECRET: string;

    // Cloudflareランタイム変数（自動バインディング）
    D1?: D1Database;
    KV_CACHE?: KVNamespace;
    STORAGE?: R2Bucket;
  }
}

// Cloudflare BindingのKVNamespaceとR2Bucket型定義
interface KVNamespace {
  get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<string | ArrayBuffer | ReadableStream | unknown | null>;
  put(key: string, value: string | ReadableStream | ArrayBuffer | FormData): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string; expiration?: number }[]; list_complete: boolean; cursor?: string }>;
}

interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | string): Promise<R2Object>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; delimiter?: string; cursor?: string; limit?: number }): Promise<R2Objects>;
}

interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
  body: ReadableStream;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T>(): Promise<T>;
  blob(): Promise<Blob>;
}

interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes: string[];
}
EOL
```

## 7. データベース接続テスト

アプリケーションからデータベースへの接続をテストします。

### 接続テストAPIエンドポイントの作成

データベース接続テスト用のAPIエンドポイントを作成します。

```bash
# APIディレクトリの作成
mkdir -p src/app/api/test

# データベース接続テストAPI作成
cat > src/app/api/test/db/route.ts << 'EOL'
import { NextResponse } from 'next/server';
import { UserRepository } from '@/infrastructure/database/repositories/user';
import { D1Database } from '@cloudflare/workers-types';

/**
 * D1データベース接続テスト用のAPIエンドポイント
 */
export async function GET() {
  try {
    // Cloudflare D1が接続されているか確認
    const d1 = process.env.D1 as D1Database | undefined;

    if (!d1) {
      return NextResponse.json(
        {
          error: 'D1データベースが接続されていません',
          hint: 'ローカル開発環境では、`wrangler pages dev`を使用してください'
        },
        { status: 500 }
      );
    }

    // ユーザーリポジトリを使用してテストクエリを実行
    const userRepo = new UserRepository(d1);
    const users = await userRepo.findAll();

    return NextResponse.json({
      success: true,
      message: 'データベース接続テスト成功',
      connectionType: 'D1 Database',
      usersCount: users.length,
      users: users.map(u => ({ id: u.id, name: u.name, email: u.email })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('データベース接続テストエラー:', error);
    return NextResponse.json(
      {
        error: 'データベース接続テストに失敗しました',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
EOL
```

### KV接続テストAPIの作成

KVストア接続テスト用のAPIエンドポイントを作成します。

```bash
# KV接続テストAPI作成
cat > src/app/api/test/kv/route.ts << 'EOL'
import { NextResponse } from 'next/server';

/**
 * KVストア接続テスト用のAPIエンドポイント
 */
export async function GET() {
  try {
    // Cloudflare KVが接続されているか確認
    const kv = process.env.KV_CACHE as KVNamespace | undefined;

    if (!kv) {
      return NextResponse.json(
        {
          error: 'KVストアが接続されていません',
          hint: 'ローカル開発環境では、`wrangler pages dev`を使用してください'
        },
        { status: 500 }
      );
    }

    // テスト用のキーを設定
    const testKey = 'connection_test';
    const testValue = {
      message: 'Connection successful',
      timestamp: new Date().toISOString(),
    };

    // KVに値を書き込み
    await kv.put(testKey, JSON.stringify(testValue));

    // KVから値を読み取り
    const retrieved = await kv.get(testKey, 'json');

    return NextResponse.json({
      success: true,
      message: 'KVストア接続テスト成功',
      connectionType: 'KV Store',
      written: testValue,
      retrieved: retrieved,
    });
  } catch (error) {
    console.error('KVストア接続テストエラー:', error);
    return NextResponse.json(
      {
        error: 'KVストア接続テストに失敗しました',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
EOL
```

### 接続テストスクリプトの作成

ローカル開発環境での接続テスト用のスクリプトを作成します。

```bash
# 接続テスト用スクリプトの作成
mkdir -p scripts
cat > scripts/test-connection.js << 'EOL'
const { spawn } = require('child_process');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const path = require('path');
const chalk = require('chalk');

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

// テスト用のローカルサーバーのポート
const PORT = 8788;
const BASE_URL = `http://localhost:${PORT}`;

// テスト対象のエンドポイント
const endpoints = [
  { name: 'データベース接続', url: `${BASE_URL}/api/test/db` },
  { name: 'KVストア接続', url: `${BASE_URL}/api/test/kv` },
];

// 非同期遅延関数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// メイン処理
async function main() {
  console.log(chalk.blue('🚀 接続テストを開始します...'));

  let wranglerProcess;

  try {
    // wrangler pages dev を起動（バックグラウンドプロセスとして）
    console.log(chalk.blue('📡 wrangler pages dev を起動しています...'));

    wranglerProcess = spawn(
      'pnpm', ['wrangler', 'pages', 'dev', '.', '--port', PORT.toString()],
      { stdio: 'pipe', detached: true }
    );

    // 標準出力のリダイレクト
    wranglerProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready on')) {
        console.log(chalk.green('✅ サーバー起動完了'));
      }
      // デバッグ出力として表示
      process.stdout.write(chalk.dim(`[wrangler] ${output}`));
    });

    // 標準エラー出力のリダイレクト
    wranglerProcess.stderr.on('data', (data) => {
      process.stderr.write(chalk.dim(`[wrangler-err] ${data.toString()}`));
    });

    // プロセス終了時のクリーンアップ
    const cleanup = () => {
      console.log(chalk.blue('🧹 プロセスをクリーンアップしています...'));
      try {
        if (wranglerProcess && !wranglerProcess.killed) {
          process.kill(-wranglerProcess.pid);
        }
      } catch (e) {
        console.error(chalk.red('クリーンアップエラー:'), e);
      }
    };

    // シグナルハンドラの設定
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // サーバー起動を少し待つ
    console.log(chalk.blue('⌛ サーバーの起動を待っています (15秒)...'));
    await delay(15000);

    // 各エンドポイントをテスト
    for (const endpoint of endpoints) {
      try {
        console.log(chalk.blue(`🔍 ${endpoint.name}テストを実行中...`));
        const response = await fetch(endpoint.url);
        const data = await response.json();

        if (response.ok) {
          console.log(chalk.green(`✅ ${endpoint.name}テスト成功!`));
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.error(chalk.red(`❌ ${endpoint.name}テスト失敗: ${data.error}`));
          console.error(data);
        }
      } catch (error) {
        console.error(chalk.red(`❌ ${endpoint.name}テスト中にエラーが発生しました:`), error);
      }

      console.log(chalk.dim('-----------------------------------'));
    }
  } catch (error) {
    console.error(chalk.red('🔥 テスト実行中に重大なエラーが発生しました:'), error);
  } finally {
    // プロセスの終了
    if (wranglerProcess) {
      process.kill(-wranglerProcess.pid);
    }
    console.log(chalk.blue('👋 テスト完了'));
    process.exit(0);
  }
}

// スクリプト実行
main().catch(console.error);
EOL

# 必要な依存関係のインストール
pnpm add -D node-fetch@2.6.7 chalk@4.1.2

# package.jsonにテストスクリプトを追加
# 以下のスクリプトをpackage.jsonのscripts部分に追加する:
# "test:connection": "node scripts/test-connection.js"
```

### テストの実行

```bash
# 接続テストの実行
pnpm test:connection

# 出力例:
# 🚀 接続テストを開始します...
# 📡 wrangler pages dev を起動しています...
# ⌛ サーバーの起動を待っています (15秒)...
# ✅ サーバー起動完了
# 🔍 データベース接続テストを実行中...
# ✅ データベース接続テスト成功!
# {
#   "success": true,
#   "message": "データベース接続テスト成功",
#   "connectionType": "D1 Database",
#   "usersCount": 0,
#   "users": [],
#   "timestamp": "2023-12-03T12:34:56.789Z"
# }
# -----------------------------------
# 🔍 KVストア接続テストを実行中...
# ✅ KVストア接続テスト成功!
# {
#   "success": true,
#   "message": "KVストア接続テスト成功",
#   "connectionType": "KV Store",
#   "written": {
#     "message": "Connection successful",
#     "timestamp": "2023-12-03T12:34:56.789Z"
#   },
#   "retrieved": {
#     "message": "Connection successful",
#     "timestamp": "2023-12-03T12:34:56.789Z"
#   }
# }
# -----------------------------------
# 👋 テスト完了
```

## 8. 初期データの投入

データベースに初期データを投入するためのシード機能を実装します。

### 8.1 シードユーティリティの作成

```bash
# シードディレクトリの作成 - 機能ごとのシードを実装可能に
mkdir -p src/infrastructure/database/seeds/[feature]

# 実装例として、user機能とtask機能のシードを作成
mkdir -p src/infrastructure/database/seeds/user
mkdir -p src/infrastructure/database/seeds/task
mkdir -p src/infrastructure/database/seeds/common
```

共通のシードユーティリティとして`seed-utils.ts`を作成します：

```bash
# 共通シードユーティリティの作成
cat > src/infrastructure/database/seeds/common/seed-utils.ts << 'EOL'
import { D1Database } from '@cloudflare/workers-types';
import { UserRepository } from '../../repositories/user';
import { TaskRepository } from '../../repositories/task';
import { generateHash } from '@/lib/auth/password';

// シード用のユーザーデータ
export const seedUsers = [
  {
    email: 'admin@example.com',
    name: '管理者',
    password: 'Admin123!',
    role: 'admin' as const,
  },
  {
    email: 'user@example.com',
    name: '一般ユーザー',
    password: 'User123!',
    role: 'user' as const,
  },
];

// シード用のタスクデータ
export const seedTasks = (userId: string) => [
  {
    title: '初期設定の完了',
    description: 'アプリケーションの初期設定を完了させる',
    status: 'done' as const,
    priority: 3,
    userId,
  },
  {
    title: 'ユーザー管理機能の実装',
    description: 'ユーザーの登録・編集・削除機能を実装する',
    status: 'in_progress' as const,
    priority: 2,
    userId,
  },
  {
    title: 'UI改善',
    description: 'ユーザーインターフェースの改善と最適化',
    status: 'todo' as const,
    priority: 1,
    userId,
  },
];

/**
 * データベースにシードデータを投入する関数
 *
 * @param d1 D1データベースインスタンス
 * @returns 処理結果
 */
export async function seedDatabase(d1: D1Database): Promise<{ success: boolean, message: string }> {
  try {
    const userRepo = new UserRepository(d1);
    const taskRepo = new TaskRepository(d1);

    // 既存ユーザーをチェック（二重投入防止）
    const existingAdmin = await userRepo.findByEmail(seedUsers[0].email);

    if (existingAdmin) {
      return {
        success: false,
        message: '初期データは既に登録されています。クリーンアップが必要な場合は、まずデータベースを初期化してください。'
      };
    }

    // ユーザー作成（パスワードハッシュ化）
    const createdUsers = [];
    for (const userData of seedUsers) {
      const hashedPassword = await generateHash(userData.password);
      const user = await userRepo.createUser({
        ...userData,
        password: hashedPassword,
      });
      createdUsers.push(user);
    }

    // タスク作成
    const adminUserId = createdUsers[0].id;
    const adminTasks = seedTasks(adminUserId);

    for (const taskData of adminTasks) {
      await taskRepo.createTask(taskData);
    }

    return {
      success: true,
      message: `シード完了: ${createdUsers.length}人のユーザーと${adminTasks.length}件のタスクを作成しました。`,
    };
  } catch (error) {
    return {
      success: false,
      message: `シード処理でエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
EOL
```

### 8.2 機能別シードの実装例

機能ごとのシードファイルを作成します。

#### ユーザーシードの実装例

```bash
# ユーザーシードの作成
cat > src/infrastructure/database/seeds/user/index.ts << 'EOL'
import { D1Database } from '@cloudflare/workers-types';
import { UserRepository } from '../../repositories/user';
import { generateHash } from '@/lib/auth/password';

// シード用のユーザーデータ
export const seedUsers = [
  {
    email: 'admin@example.com',
    name: '管理者',
    password: 'Admin123!',
    role: 'admin' as const,
  },
  {
    email: 'user@example.com',
    name: '一般ユーザー',
    password: 'User123!',
    role: 'user' as const,
  },
];

/**
 * ユーザーデータをシードする関数
 */
export async function seedUsers(d1: D1Database): Promise<{ success: boolean, users: any[], message: string }> {
  try {
    const userRepo = new UserRepository(d1);

    // 既存ユーザーをチェック（二重投入防止）
    const existingAdmin = await userRepo.findByEmail(seedUsers[0].email);

    if (existingAdmin) {
      return {
        success: false,
        users: [],
        message: 'ユーザーデータは既に登録されています'
      };
    }

    // ユーザー作成（パスワードハッシュ化）
    const createdUsers = [];
    for (const userData of seedUsers) {
      const hashedPassword = await generateHash(userData.password);
      const user = await userRepo.createUser({
        ...userData,
        password: hashedPassword,
      });
      createdUsers.push(user);
    }

    return {
      success: true,
      users: createdUsers,
      message: `${createdUsers.length}人のユーザーを作成しました`
    };
  } catch (error) {
    return {
      success: false,
      users: [],
      message: `ユーザーシード処理でエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
EOL
```

#### タスクシードの実装例

```bash
# タスクシードの作成
cat > src/infrastructure/database/seeds/task/index.ts << 'EOL'
import { D1Database } from '@cloudflare/workers-types';
import { TaskRepository } from '../../repositories/task';

// シード用のタスクデータ
export const seedTasks = (userId: string) => [
  {
    title: '初期設定の完了',
    description: 'アプリケーションの初期設定を完了させる',
    status: 'done' as const,
    priority: 3,
    userId,
  },
  {
    title: 'ユーザー管理機能の実装',
    description: 'ユーザーの登録・編集・削除機能を実装する',
    status: 'in_progress' as const,
    priority: 2,
    userId,
  },
  {
    title: 'UI改善',
    description: 'ユーザーインターフェースの改善と最適化',
    status: 'todo' as const,
    priority: 1,
    userId,
  },
];

/**
 * タスクデータをシードする関数
 */
export async function seedTasksForUser(d1: D1Database, userId: string): Promise<{ success: boolean, tasks: any[], message: string }> {
  try {
    const taskRepo = new TaskRepository(d1);
    const tasksToCreate = seedTasks(userId);

    const createdTasks = [];
    for (const taskData of tasksToCreate) {
      const task = await taskRepo.createTask(taskData);
      createdTasks.push(task);
    }

    return {
      success: true,
      tasks: createdTasks,
      message: `${createdTasks.length}件のタスクを作成しました`
    };
  } catch (error) {
    return {
      success: false,
      tasks: [],
      message: `タスクシード処理でエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
EOL
```

### 8.3 パスワードハッシュユーティリティの作成

```bash
# パスワードハッシュユーティリティの作成
mkdir -p src/lib/auth
touch src/lib/auth/password.ts
```

`password.ts`に以下の内容を記述します：

```typescript
import { pbkdf2Sync, randomBytes } from 'crypto';

/**
 * パスワードをハッシュ化する関数
 *
 * @param password 平文パスワード
 * @returns ハッシュ化されたパスワード（salt:hash形式）
 */
export async function generateHash(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * パスワードハッシュを検証する関数
 *
 * @param storedHash 保存されているハッシュ
 * @param password 検証する平文パスワード
 * @returns 検証結果（一致する場合true）
 */
export async function verifyHash(storedHash: string, password: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');
  const calculatedHash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === calculatedHash;
}
```

### 8.4 シード実行APIの作成

APIエンドポイントを作成してシード処理を実行できるようにします：

```bash
# シード実行API作成用のディレクトリ
mkdir -p src/app/api/admin/seed
touch src/app/api/admin/seed/route.ts
```

`route.ts`に以下の内容を記述します：

```typescript
import { NextResponse } from 'next/server';
import { seedDatabase } from '@/infrastructure/database/seeds/seed-utils';
import { D1Database } from '@cloudflare/workers-types';

/**
 * 管理者向けのシードAPIエンドポイント
 * 本番環境では実行できない安全対策あり
 */
export async function POST(req: Request) {
  try {
    // 本番環境では実行不可（安全対策）
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          error: '本番環境ではこの操作は実行できません。開発/ステージング環境でのみ使用可能です。',
        },
        { status: 403 }
      );
    }

    // D1が接続されているか確認
    const d1 = process.env.D1 as D1Database | undefined;
    if (!d1) {
      return NextResponse.json(
        { error: 'D1データベースが接続されていません。`wrangler pages dev`で起動してください。' },
        { status: 500 }
      );
    }

    // シード実行
    const result = await seedDatabase(d1);

    if (result.success) {
      return NextResponse.json({ message: result.message });
    } else {
      return NextResponse.json({ warning: result.message }, { status: 400 });
    }
  } catch (error) {
    console.error('シード処理エラー:', error);
    return NextResponse.json(
      {
        error: 'シード処理に失敗しました',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
```

### 8.5 package.jsonへのスクリプト追加

`package.json`に以下のスクリプトを追加します：

```json
"scripts": {
  // ... 既存のスクリプト
  "db:generate": "drizzle-kit generate",
  "db:migrate": "node scripts/migrate.js",
  "db:studio": "drizzle-kit studio",
  "db:seed": "node scripts/seed-db.js"
}
```

### 8.6 必要な依存関係のインストール

```bash
# 必要な依存関係をインストール
pnpm add -D node-fetch@2.6.7 chalk@4.1.2
```

### 8.7 シードの実行

以下のコマンドでシードを実行します：

```bash
pnpm db:seed
```

成功すると以下のような出力が表示されます：

```
🌱 データベースシードを開始します...
📡 wrangler pages dev を起動しています...
⌛ サーバーの起動を待っています (15秒)...
✅ サーバー起動完了
🔍 シードAPIを呼び出しています...
✅ シード成功!
シード完了: 2人のユーザーと3件のタスクを作成しました。
👋 処理完了
```

### 8.5 シード実行スクリプトの作成

コマンドラインからシード処理を実行できるスクリプトを作成します。機能ごとのシードを個別に実行したり、全機能のシードを一括実行したりできるように設計します。

```bash
# シード実行スクリプト作成
mkdir -p scripts
cat > scripts/seed-db.js << 'EOL'
const fetch = require('node-fetch');
const { spawn } = require('child_process');
const dotenv = require('dotenv');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

// テスト用のローカルサーバーのポート
const PORT = 8789;
const SEED_ENDPOINT = `http://localhost:${PORT}/api/admin/seed`;

// 利用可能な機能のシードを検出
const SEEDS_DIR = path.resolve(__dirname, '../src/infrastructure/database/seeds');
const availableFeatures = fs.readdirSync(SEEDS_DIR)
  .filter(dir => {
    // common以外のディレクトリかつ、index.tsがあるものを検出
    const isDirectory = fs.statSync(path.join(SEEDS_DIR, dir)).isDirectory();
    const hasIndexFile = fs.existsSync(path.join(SEEDS_DIR, dir, 'index.ts'));
    return isDirectory && hasIndexFile && dir !== 'common';
  });

// コマンドライン引数を解析
const args = process.argv.slice(2);
const requestedFeatures = args.length > 0 ? args : ['all'];

// 非同期遅延関数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// メイン処理
async function main() {
  console.log(chalk.blue('🌱 データベースシードを開始します...'));

  if (requestedFeatures.includes('all')) {
    console.log(chalk.blue(`すべての機能(${availableFeatures.join(', ')})のシードを実行します`));
  } else {
    // 有効なフィーチャーかチェック
    const invalidFeatures = requestedFeatures.filter(f => !availableFeatures.includes(f));
    if (invalidFeatures.length > 0) {
      console.error(chalk.red(`エラー: 次の機能は有効ではありません: ${invalidFeatures.join(', ')}`));
      console.log(chalk.yellow(`有効な機能は次のとおりです: ${availableFeatures.join(', ')}`));
      process.exit(1);
    }
    console.log(chalk.blue(`指定された機能(${requestedFeatures.join(', ')})のシードを実行します`));
  }

  let wranglerProcess;

  try {
    // wrangler pages dev を起動
    console.log(chalk.blue('📡 wrangler pages dev を起動しています...'));

    wranglerProcess = spawn(
      'pnpm', ['wrangler', 'pages', 'dev', '.', '--port', PORT.toString()],
      { stdio: 'pipe', detached: true }
    );

    // プロセス出力のハンドリング
    wranglerProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready on')) {
        console.log(chalk.green('✅ サーバー起動完了'));
      }
      // 詳細出力
      process.stdout.write(chalk.dim(`[wrangler] ${output}`));
    });

    // エラー出力のハンドリング
    wranglerProcess.stderr.on('data', (data) => {
      process.stderr.write(chalk.dim(`[wrangler-err] ${data.toString()}`));
    });

    // サーバー起動を待つ
    console.log(chalk.blue('⌛ サーバーの起動を待っています (15秒)...'));
    await delay(15000);

    // シードAPIを呼び出し
    console.log(chalk.blue('🔍 シードAPIを呼び出しています...'));

    const features = requestedFeatures.includes('all') ? availableFeatures : requestedFeatures;

    const response = await fetch(SEED_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ features }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(chalk.green('✅ シード成功!'));
      console.log(chalk.green(data.message));

      // 各機能の詳細結果を表示
      if (data.results) {
        Object.entries(data.results).forEach(([feature, result]) => {
          console.log(chalk.cyan(`- ${feature}: ${result.message}`));
        });
      }
    } else {
      if (response.status === 400 && data.warning) {
        console.warn(chalk.yellow('⚠️ 警告:'), data.warning);
      } else {
        console.error(chalk.red('❌ シード失敗:'), data.error || 'unknown error');
      }
    }
  } catch (error) {
    console.error(chalk.red('🔥 シード実行中にエラーが発生しました:'), error);
  } finally {
    // プロセスのクリーンアップ
    if (wranglerProcess) {
      try {
        process.kill(-wranglerProcess.pid);
      } catch (e) {
        // プロセスが既に終了している場合は無視
      }
    }
    console.log(chalk.blue('👋 処理完了'));
    process.exit(0);
  }
}

// スクリプト実行
main().catch(console.error);
EOL
```

これにより、次のようにシードを実行できます：

```bash
# すべての機能のシードを実行
pnpm db:seed

# 特定の機能のみシードを実行
pnpm db:seed user
pnpm db:seed task

# 複数の機能を指定してシードを実行
pnpm db:seed user task
```

### 8.6 シードAPIエンドポイントの拡張

機能ごとのシード実行をサポートするために、APIエンドポイントを拡張します。

```bash
# シード実行APIを更新
cat > src/app/api/admin/seed/route.ts << 'EOL'
import { NextResponse } from 'next/server';
import { seedDatabase } from '@/infrastructure/database/seeds/common/seed-utils';
import { D1Database } from '@cloudflare/workers-types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 管理者向けのシードAPIエンドポイント
 * 本番環境では実行できない安全対策あり
 */
export async function POST(req: Request) {
  try {
    // 本番環境では実行不可（安全対策）
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: '本番環境ではこの操作は実行できません。開発/ステージング環境でのみ使用可能です。' },
        { status: 403 }
      );
    }

    // D1が接続されているか確認
    const d1 = process.env.D1 as D1Database | undefined;
    if (!d1) {
      return NextResponse.json(
        { error: 'D1データベースが接続されていません。`wrangler pages dev`で起動してください。' },
        { status: 500 }
      );
    }

    // リクエストボディを解析
    const body = await req.json().catch(() => ({}));
    const requestedFeatures = Array.isArray(body.features) ? body.features : [];

    // 利用可能な機能のシードを確認
    const seedsDir = path.resolve(process.cwd(), 'src/infrastructure/database/seeds');
    const availableFeatures = fs.readdirSync(seedsDir)
      .filter(dir => {
        try {
          const stat = fs.statSync(path.join(seedsDir, dir));
          const hasIndexFile = fs.existsSync(path.join(seedsDir, dir, 'index.ts'));
          return stat.isDirectory() && hasIndexFile && dir !== 'common';
        } catch (e) {
          return false;
        }
      });

    // 特定の機能が指定されていない場合や'all'が指定されている場合は、すべての機能を対象にする
    const featuresToSeed = requestedFeatures.length > 0 ?
      requestedFeatures.filter(f => availableFeatures.includes(f)) :
      availableFeatures;

    if (featuresToSeed.length === 0) {
      // 共通シードに戻る
      const result = await seedDatabase(d1);
      return result.success ?
        NextResponse.json({ message: result.message }) :
        NextResponse.json({ warning: result.message }, { status: 400 });
    }

    // 各機能のシードを実行
    const results: Record<string, any> = {};
    let successCount = 0;

    for (const feature of featuresToSeed) {
      try {
        // 動的にシードモジュールをインポート
        const seedModule = require(`@/infrastructure/database/seeds/${feature}`);
        const seedFunction = seedModule.default || Object.values(seedModule)[0];

        if (typeof seedFunction === 'function') {
          // シード関数を実行
          const result = await seedFunction(d1);
          results[feature] = result;

          if (result.success) {
            successCount++;
          }
        } else {
          results[feature] = {
            success: false,
            message: `シード関数が見つかりません (${feature})`
          };
        }
      } catch (error) {
        results[feature] = {
          success: false,
          message: `シード実行エラー: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    // 結果の集計
    const allSuccess = successCount === featuresToSeed.length;
    const message = allSuccess ?
      `すべてのシードが成功しました (${successCount}/${featuresToSeed.length})` :
      `一部のシードが失敗しました (成功: ${successCount}/${featuresToSeed.length})`;

    return NextResponse.json({
      success: allSuccess,
      message,
      results,
      features: featuresToSeed,
    }, { status: allSuccess ? 200 : 207 });

  } catch (error) {
    console.error('シード処理エラー:', error);
    return NextResponse.json(
      { error: 'シード処理に失敗しました', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
EOL
```

### 8.7 必要な依存関係のインストール

```bash
# 必要な依存関係をインストール
pnpm add -D node-fetch@2.6.7 chalk@4.1.2
```

### 8.8 package.jsonへのスクリプト追加

`package.json`に以下のスクリプトを追加します：

```json
"scripts": {
  // ... 既存のスクリプト
  "db:generate": "drizzle-kit generate",
  "db:migrate": "node scripts/migrate.js",
```

4. データベースを初期化して再試行（開発環境のみ）

   ```bash
   # データベースを初期化（既存データはすべて削除されるので注意）
   # これは開発環境でのみ行うこと
   wrangler d1 execute automationa-tools-db --command "DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS tasks;"

   # マイグレーションを再実行
   pnpm db:migrate
   ```

### 10.4 デプロイの問題

**症状**: Cloudflare Pagesへのデプロイでエラーが発生する

**解決策**:

1. APIトークンの権限を確認

   - Cloudflareダッシュボードで、使用しているAPIトークンがCF_API_TOKENに正しく設定されているか確認
   - トークンにPages、D1、KV、R2の編集権限があるか確認

2. 環境変数が正しく設定されているか確認

   ```bash
   # 環境変数が設定されているか確認（値は表示されないが名前は確認可能）
   env | grep CF_
   env | grep D1_
   env | grep KV_
   ```

3. wranglerのバージョンを確認

   ```bash
   wrangler --version
   # 最新バージョンでない場合は更新
   pnpm add -g wrangler@latest
   ```

4. ローカルでビルドできるか確認

   ```bash
   # ローカルビルドテスト
   pnpm build
   ```

5. 手動デプロイを試す
   ```bash
   # 手動でデプロイ
   pnpm wrangler pages deploy ./out --project-name=automationa-tools-application
   ```

### 10.5 一般的なデバッグ手法

1. **ログを詳細に出力**:

   ```js
   // サーバーサイドコードでのデバッグ
   console.log('デバッグ情報:', {
     variable1,
     variable2,
     objectDetails: JSON.stringify(someObject, null, 2),
   });
   ```

2. **Cloudflareログの確認**:

   ```bash
   # Cloudflareワーカーのログを表示
   wrangler tail
   ```

3. **環境変数の確認**:

   ```bash
   # Cloudflare上の環境変数を表示
   wrangler pages env list
   ```

4. **データベース状態の確認**:

   ```bash
   # テーブル一覧を表示
   wrangler d1 execute automationa-tools-db --command "SELECT name FROM sqlite_master WHERE type='table'"

   # レコード数を確認
   wrangler d1 execute automationa-tools-db --command "SELECT COUNT(*) FROM users"
   ```

5. **Drizzle Studio を使ったデータベース操作**:
   ```bash
   # Drizzle Studio を起動
   pnpm db:studio
   # ブラウザでデータベースを視覚的に操作可能
   ```

### 10.3 マイグレーションの問題

**症状**: マイグレーション実行時にエラーが発生する

**解決策**:

1. マイグレーションファイルの文法エラーをチェック

   ```bash
   # マイグレーションファイルの内容を確認
   cat drizzle/*.sql
   # SQLの文法エラーがないか確認
   ```

2. マイグレーションを清掃して再生成

   ```bash
   # 古いマイグレーションをクリア
   rm -rf drizzle

   # スキーマから再生成
   pnpm drizzle-kit generate
   ```

3. D1データベース接続設定を確認

   ```bash
   # D1データベースIDが正しく設定されているか確認
   grep "database_id" wrangler.toml

   # D1バインディング名が正しいか確認
   grep "binding" wrangler.toml | grep -A 1 "d1_databases"
   ```

4. データベースを初期化して再試行（開発環境のみ）

   ```bash
   # データベースを初期化（既存データはすべて削除されるので注意）
   # これは開発環境でのみ行うこと
   wrangler d1 execute automationa-tools-db --command "DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS tasks;"

   # マイグレーションを再実行
   pnpm db:migrate
   ```

## まとめ

このガイドでは、以下の内容を詳細に説明しました：

1. Cloudflare D1（SQLite互換）、KV、R2の効率的な設定方法
2. Drizzle ORMを活用した型安全なデータモデリング
3. リポジトリパターンによるデータアクセス層の抽象化
4. ローカル開発環境と本番環境の一貫した構成
5. CI/CDパイプラインによる安全で再現性の高いデプロイ
6. データベースマイグレーションと初期データの管理手法
7. 一般的な問題に対する体系的なトラブルシューティング

このドキュメントの手順に従うことで、エンジニアは一貫した方法でCloudflare D1、KV、R2を使用したスケーラブルなアプリケーションを設定・デプロイできます。また、このアーキテクチャは将来的なリソース拡張や他プロバイダーへの移行も容易になるよう設計されています。

次のステップとして、[全体アーキテクチャルール](./overall_rule.md)に基づく機能開発や、[初期設定ガイド](./initial_setup_guide.md)で説明されているフロントエンド連携に進むことをお勧めします。
