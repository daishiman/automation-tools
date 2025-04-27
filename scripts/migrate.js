import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュールで__dirnameを取得するための設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// マイグレーションディレクトリのパス
const MIGRATIONS_DIR = path.resolve(__dirname, '../drizzle');

// 環境に基づいてデータベース名を決定
const ENV = process.env.ENVIRONMENT || 'local';
let DB_NAME;

switch (ENV) {
  case 'production':
    DB_NAME = 'automationa-tools-prod-db';
    break;
  case 'preview':
    DB_NAME = 'automationa-tools-dev-db';
    break;
  default:
    DB_NAME = 'automationa-tools-local-db';
}

console.log(`🔍 環境: ${ENV}, データベース: ${DB_NAME}`);

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
    // 環境に応じたコマンドオプションを追加
    let command = `pnpm wrangler d1 execute ${DB_NAME} --file=${filePath}`;

    // ローカル環境の場合は--localフラグを追加
    if (ENV === 'local') {
      command += ' --local';
    } else if (ENV === 'preview' || ENV === 'production') {
      // 特定の環境フラグを追加
      command += ` --env=${ENV}`;
    }

    console.log(`実行コマンド: ${command}`);
    execSync(command, {
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
