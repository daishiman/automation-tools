import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュールで__dirnameを取得するための設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// マイグレーションディレクトリのパス
const MIGRATIONS_DIR = path.resolve(__dirname, '../drizzle');

// データベース名
const DB_NAME = 'automationa-tools-db';

// すべてのSQLファイルを取得して昇順にソート
const sqlFiles = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort();

if (sqlFiles.length === 0) {
  console.error(
    '❌ マイグレーションファイルが見つかりません。まず `pnpm drizzle-kit generate` を実行してください。'
  );
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
      stdio: 'inherit',
    });
    console.log(`✅ マイグレーション成功: ${file}`);
  } catch (error) {
    console.error(`❌ マイグレーション失敗: ${file}`);
    console.error(error.message);
    process.exit(1);
  }
}

console.log('🎉 すべてのマイグレーションが正常に実行されました！');
