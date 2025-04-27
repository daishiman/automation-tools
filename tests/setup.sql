-- CI用データベース統合テストのセットアップSQL
-- このファイルはD1データベースの初期化に使用されます

-- ユーザーテーブルを作成
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- タスクテーブルを作成
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  user_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- テスト用のデータを挿入
INSERT INTO users (id, name, email) VALUES
  ('user1', 'テストユーザー1', 'test1@example.com'),
  ('user2', 'テストユーザー2', 'test2@example.com');

INSERT INTO tasks (id, title, description, status, user_id) VALUES
  ('task1', 'テストタスク1', 'テスト用タスク説明1', 'new', 'user1'),
  ('task2', 'テストタスク2', 'テスト用タスク説明2', 'in_progress', 'user1'),
  ('task3', 'テストタスク3', 'テスト用タスク説明3', 'completed', 'user2');