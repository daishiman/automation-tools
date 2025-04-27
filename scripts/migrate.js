import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

// ESモジュールで__dirnameを取得するための設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// マイグレーションディレクトリのパス
const MIGRATIONS_DIR = path.resolve(__dirname, '../drizzle');
const TEMP_DIR = path.resolve(os.tmpdir(), 'automationa-tools-migrations');

// 一時ディレクトリを作成
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// 環境に基づいてデータベース名とconfigファイルを決定
const ENV = process.env.ENVIRONMENT || 'local';
let DB_NAME;
let CONFIG_FILE;

switch (ENV) {
  case 'production':
    DB_NAME = 'automationa-tools-prod-db';
    CONFIG_FILE = 'wrangler.toml';
    break;
  case 'preview':
    DB_NAME = 'automationa-tools-dev-db';
    CONFIG_FILE = 'wrangler.toml';
    break;
  default:
    DB_NAME = 'automationa-tools-local-db';
    CONFIG_FILE = 'wrangler-local.toml';
}

console.log(`🔍 環境: ${ENV}, データベース: ${DB_NAME}, 設定ファイル: ${CONFIG_FILE}`);

// SQLファイルを変換してIF NOT EXISTSを追加する関数
function addIfNotExists(sqlContent) {
  // CREATE TABLE文を検出して変換
  return sqlContent.replace(
    /CREATE\s+TABLE\s+(?!IF NOT EXISTS)(`[^`]+`|[^\s(]+)/gi,
    'CREATE TABLE IF NOT EXISTS $1'
  );
}

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
let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (const file of sqlFiles) {
  const filePath = path.join(MIGRATIONS_DIR, file);
  console.log(`⚙️ マイグレーションを実行中: ${file}`);

  try {
    // SQLファイルを読み込んでIF NOT EXISTSを追加
    const originalSql = fs.readFileSync(filePath, 'utf8');
    const modifiedSql = addIfNotExists(originalSql);

    // 変換したSQLを一時ファイルに書き込み
    const tempFilePath = path.join(TEMP_DIR, file);
    fs.writeFileSync(tempFilePath, modifiedSql, 'utf8');

    // 元のファイルと変換後のファイルが異なる場合はログに出力
    if (originalSql !== modifiedSql) {
      console.log(`ℹ️ SQLファイルを変換: CREATE TABLE → CREATE TABLE IF NOT EXISTS`);
    }

    // wranglerコマンドを実行
    // 環境に応じたコマンドオプションを追加
    let command = `pnpm wrangler d1 execute ${DB_NAME} --file=${tempFilePath} --config=${CONFIG_FILE}`;

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
    successCount++;
  } catch (error) {
    // エラー処理を改善：既存テーブルのエラーを無視するオプション
    if (error.toString().includes('already exists')) {
      console.warn(`⚠️ テーブルは既に存在します: ${file} - 処理を続行します`);
      skipCount++;
    } else {
      console.error(`❌ マイグレーション失敗: ${file}`);
      console.error(error.toString());
      errorCount++;
      // 重大なエラーの場合のみ中断する
      if (!process.env.CONTINUE_ON_ERROR) {
        process.exit(1);
      }
    }
  }
}

// 一時ディレクトリのクリーンアップ
try {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  console.log(`🧹 一時ファイルを削除しました: ${TEMP_DIR}`);
} catch (error) {
  console.warn(`⚠️ 一時ファイルの削除に失敗しました: ${error.message}`);
}

console.log('📊 マイグレーション結果:');
console.log(`✅ 成功: ${successCount}個`);
console.log(`⚠️ スキップ: ${skipCount}個`);
console.log(`❌ エラー: ${errorCount}個`);

if (errorCount === 0) {
  console.log('🎉 すべてのマイグレーションが正常に実行またはスキップされました！');
} else {
  console.error('⚠️ 一部のマイグレーションでエラーが発生しました。ログを確認してください。');
  process.exit(1);
}
