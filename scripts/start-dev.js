/**
 * カスタム開発サーバー起動スクリプト
 * 環境変数を使って異なる環境設定でwranglerを起動します
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 環境変数からWrangler環境を取得（デフォルトはlocal）
const wranglerEnv = process.env.WRANGLER_ENV || 'local';

// 環境ごとの設定ファイル
const envFiles = {
  local: '.env.local',
  preview: '.env.preview',
  production: '.env.production',
};

/**
 * 環境変数ファイルを読み込む
 * @param {string} envFile - 環境変数ファイルのパス
 */
function loadEnvFile(envFile) {
  if (!envFile) {
    console.warn('警告: 環境ファイルが指定されていません。');
    return;
  }

  const envPath = path.resolve(process.cwd(), envFile);

  if (fs.existsSync(envPath)) {
    console.log(`環境変数ファイルを読み込み: ${envFile}`);
    const envConfig = dotenv.parse(fs.readFileSync(envPath));

    // 環境変数を設定
    for (const key in envConfig) {
      process.env[key] = envConfig[key];
    }
  } else {
    console.warn(`警告: ${envFile} が見つかりません。`);
  }
}

/**
 * 環境ファイルを一時的にコピーする
 * @param {string} env - 環境名
 * @returns {string} 元の.env.localパス
 */
function setupEnvFile(env) {
  if (env === 'local') {
    return null; // ローカル環境はデフォルトで設定済み
  }

  // 現在の.env.localをバックアップ
  const localEnvPath = path.resolve(process.cwd(), '.env.local');
  const backupEnvPath = path.resolve(process.cwd(), '.env.local.backup');
  let existingLocalEnv = null;

  if (fs.existsSync(localEnvPath)) {
    console.log('.env.localをバックアップします');
    existingLocalEnv = fs.readFileSync(localEnvPath, 'utf8');
    fs.writeFileSync(backupEnvPath, existingLocalEnv);
  }

  // 対象環境の.envファイルを.env.localとしてコピー
  const targetEnvFile = envFiles[env];
  const targetEnvPath = path.resolve(process.cwd(), targetEnvFile);

  if (fs.existsSync(targetEnvPath)) {
    console.log(`${targetEnvFile}を.env.localにコピーします`);
    const targetEnvContent = fs.readFileSync(targetEnvPath, 'utf8');
    fs.writeFileSync(localEnvPath, targetEnvContent);
  } else {
    console.warn(`警告: ${targetEnvFile}が見つかりません。`);
  }

  return existingLocalEnv;
}

/**
 * 環境ファイルを元に戻す
 * @param {string} originalContent - 元の.env.localの内容
 */
function restoreEnvFile(originalContent) {
  if (originalContent === null) return;

  const localEnvPath = path.resolve(process.cwd(), '.env.local');
  const backupEnvPath = path.resolve(process.cwd(), '.env.local.backup');

  if (originalContent) {
    console.log('.env.localを元に戻します');
    fs.writeFileSync(localEnvPath, originalContent);
  } else if (fs.existsSync(backupEnvPath)) {
    const backupContent = fs.readFileSync(backupEnvPath, 'utf8');
    fs.writeFileSync(localEnvPath, backupContent);
    fs.unlinkSync(backupEnvPath);
  } else {
    if (fs.existsSync(localEnvPath)) {
      fs.unlinkSync(localEnvPath);
    }
  }
}

/**
 * 開発サーバーを起動する
 */
function startDevServer() {
  let originalEnvContent = null;

  try {
    console.log(`${wranglerEnv}環境の開発サーバーを起動します`);

    // 非ローカル環境の場合、一時的に.env.localを置き換える
    if (wranglerEnv !== 'local') {
      originalEnvContent = setupEnvFile(wranglerEnv);
    }

    // 標準のwranglerコマンドを使用
    execSync(`pnpm exec wrangler pages dev out --port 3000 --inspector-port=9229`, {
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('開発サーバーの起動に失敗しました:', error.message);
    process.exit(1);
  } finally {
    // 環境ファイルを元に戻す
    if (wranglerEnv !== 'local') {
      restoreEnvFile(originalEnvContent);
    }
  }
}

// メイン処理
function main() {
  console.log(`開発環境: ${wranglerEnv}`);

  // 環境変数ファイルを読み込む
  loadEnvFile(envFiles[wranglerEnv]);

  // 開発サーバーを起動
  startDevServer();
}

main();
