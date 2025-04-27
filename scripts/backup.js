import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { fileURLToPath } from 'url';

// __dirnameの代替（ESモジュールでは直接使えないため）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数の取得
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
const D1_DATABASE_NAME = process.env.D1_DATABASE_NAME;
const D1_DATABASE_ID = process.env.D1_DATABASE_ID;
const R2_BACKUPS_BUCKET_NAME = process.env.R2_BACKUPS_BUCKET_NAME;
const ENVIRONMENT = process.env.ENVIRONMENT || 'development';

// 必須環境変数のチェック
if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
  console.error('❌ 必須環境変数が設定されていません。以下の環境変数を設定してください：');
  console.error('   CLOUDFLARE_API_TOKEN');
  console.error('   CLOUDFLARE_ACCOUNT_ID');
  process.exit(1);
}

// 環境に基づくデータベース名とバケット名の設定
const dbName =
  D1_DATABASE_NAME ||
  (ENVIRONMENT === 'production' ? 'automationa-tools-db' : 'automationa-tools-dev-db');

const backupBucketName =
  R2_BACKUPS_BUCKET_NAME ||
  (ENVIRONMENT === 'production' ? 'automationa-tools-backup' : 'dev-automationa-tools-backup');

console.log(`🌍 実行環境: ${ENVIRONMENT}`);
console.log(`📊 使用するデータベース: ${dbName}`);
console.log(`💾 バックアップ保存先: ${backupBucketName}`);

// D1データベースIDのチェック
if (!D1_DATABASE_ID) {
  console.warn(
    '⚠️ 警告: D1_DATABASE_ID環境変数が設定されていません。一部の機能が制限される可能性があります。'
  );
}

// 一時ディレクトリパス
const TEMP_DIR = path.resolve(__dirname, '../temp_backup');

// バックアップ時のタイムスタンプ形式
const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
const backupFileName = `db-backup-${dbName}-${timestamp}.sql`;
const backupFilePath = path.join(TEMP_DIR, backupFileName);

// 一時ディレクトリの作成
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

console.log(`🔍 データベース ${dbName} のバックアップを開始します...`);

try {
  // D1データベースのエクスポート（SQLダンプ作成）
  console.log('⚙️ データベースのSQLダンプを作成中...');

  // CLOUDFLARE_API_TOKENとCLOUDFLARE_ACCOUNT_IDの設定
  process.env.CLOUDFLARE_API_TOKEN = CLOUDFLARE_API_TOKEN;
  process.env.CLOUDFLARE_ACCOUNT_ID = CLOUDFLARE_ACCOUNT_ID;

  // 環境フラグを設定（productionまたはpreview）
  const envFlag = ENVIRONMENT === 'production' ? '--env=production' : '--env=preview';

  // wranglerコマンドを実行してデータベースをエクスポート
  execSync(`pnpm exec wrangler d1 backup ${dbName} ${envFlag} --remote > ${backupFilePath}`, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  console.log(`✅ データベースのバックアップを作成しました: ${backupFilePath}`);

  // バックアップファイルが作成されたか確認
  if (!fs.existsSync(backupFilePath) || fs.statSync(backupFilePath).size === 0) {
    throw new Error('バックアップファイルが正常に作成されませんでした。');
  }

  // R2ストレージにバックアップをアップロード
  if (R2_BACKUPS_BUCKET_NAME) {
    console.log(`⚙️ バックアップをR2ストレージ（${backupBucketName}）にアップロード中...`);

    // R2バケットにファイルをアップロード
    execSync(
      `pnpm exec wrangler r2 object put ${backupBucketName}/${backupFileName} --file=${backupFilePath} ${envFlag} --remote`,
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    console.log(`✅ R2ストレージへのアップロードが完了しました`);
    console.log('📋 最新のバックアップファイル一覧:');

    // 最新のバックアップファイルを5件まで表示
    const latestBackups = execSync(
      `pnpm exec wrangler r2 object list ${backupBucketName} --prefix="db-backup-" --max-keys=5 ${envFlag} --remote`,
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
  }

  // 一時ファイルの削除（任意）
  fs.unlinkSync(backupFilePath);
  console.log(`🧹 一時バックアップファイルを削除しました: ${backupFilePath}`);

  console.log('🎉 データベースバックアップが正常に完了しました！');
} catch (error) {
  console.error(`❌ バックアップ処理中にエラーが発生しました: ${error.message}`);

  // エラーの詳細情報を表示
  if (error.stderr) {
    console.error(`エラー詳細: ${error.stderr.toString()}`);
  }

  process.exit(1);
}
