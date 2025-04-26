/**
 * Wranglerコマンド実行ヘルパー
 * .envファイルを適切に読み込み、Wranglerコマンドを実行するためのユーティリティ
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// コマンドライン引数の解析
function parseArgs() {
  const args = process.argv.slice(2);
  let command = '';
  let environment = 'preview'; // デフォルトはpreview
  let configFile = ''; // 設定ファイルパス

  // 引数を解析
  args.forEach((arg) => {
    // --mode=xxx 形式の引数
    if (arg.startsWith('--mode=')) {
      command = arg.split('=')[1];
    }
    // --env=xxx 形式の引数
    else if (arg.startsWith('--env=')) {
      environment = arg.split('=')[1];
    }
    // --config=xxx 形式の引数
    else if (arg.startsWith('--config=')) {
      configFile = arg.split('=')[1];
    }
    // 位置引数（従来の形式）
    else if (!arg.startsWith('--')) {
      if (!command) {
        command = arg;
      } else if (command && environment === 'preview' && !configFile) {
        environment = arg;
      }
    }
  });

  return { command, environment, configFile };
}

// 引数を解析
const { command, environment, configFile } = parseArgs();

// 環境ごとの設定ファイル
const envFiles = {
  preview: '.env.development', // 開発環境（Cloudflare Pagesではpreview）
  production: '.env.production', // 本番環境
  local: '.env.local', // ローカル開発
};

// 環境とブランチのマッピング
const branchMap = {
  preview: 'develop', // 開発環境はdevelopブランチ
  production: 'main', // 本番環境はmainブランチ
  local: 'local', // ローカル環境
};

// 環境別のデータベース名
const dbNames = {
  preview: 'automationa-tools-dev-db', // 開発環境用DB名
  production: 'automationa-tools-prod-db', // 本番環境用DB名
  local: 'automationa-tools-local-db', // ローカル環境用DB名
};

// R2バケット名
const r2BucketNames = {
  preview: 'dev-automationa-tools-storage', // 開発環境用R2バケット
  production: 'automationa-tools-storage', // 本番環境用R2バケット
  local: 'local-automationa-tools-storage', // ローカル環境用R2バケット
};

// R2バインディング名
const r2BindingNames = {
  preview: 'R2_STORAGE', // 開発環境でのバインディング名
  production: 'R2_STORAGE', // 本番環境でのバインディング名
  local: 'R2_STORAGE', // ローカル環境でのバインディング名
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
 * Wranglerコマンドを実行する
 * @param {string} cmd - 実行するWranglerコマンド
 * @param {string} env - 環境名（preview/production/local）
 * @param {string} config - 設定ファイルパス（オプション）
 */
function runWranglerCommand(cmd, env, config) {
  let wranglerCmd;

  // 設定ファイルが指定されている場合
  if (config) {
    wranglerCmd = `pnpm exec wrangler ${cmd} --config=${config}`;
  }
  // Pagesデプロイの場合は--branchフラグを使用
  else if (cmd.includes('pages deploy')) {
    if (env === 'local') {
      console.error('ローカル環境ではPagesデプロイはサポートされていません');
      process.exit(1);
    }
    wranglerCmd = `pnpm exec wrangler ${cmd} --branch=${branchMap[env]}`;
  } else {
    // その他のコマンドは--envフラグを使用
    // ローカル環境の場合、環境名を'development'として扱う（wrangler dev用）
    const wranglerEnv = env === 'local' ? 'development' : env;
    wranglerCmd = `pnpm exec wrangler ${cmd} --env=${wranglerEnv}`;
  }

  console.log(`実行中: ${wranglerCmd}`);

  try {
    execSync(wranglerCmd, { stdio: 'inherit' });
  } catch (error) {
    console.error(`エラー: コマンド実行に失敗しました。`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * LLM設定をコマンドラインに出力
 */
function printLLMConfig() {
  console.log('\n現在のLLM設定:');
  console.log(`- デフォルトプロバイダー: ${process.env.DEFAULT_LLM_PROVIDER || 'undefined'}`);
  console.log(`- デフォルトモデル: ${process.env.DEFAULT_LLM_MODEL || 'undefined'}`);

  // 各LLMプロバイダーの設定を表示
  const providers = ['OPENAI', 'ANTHROPIC', 'GOOGLE', 'MISTRAL', 'COHERE'];

  providers.forEach((provider) => {
    const apiKey = process.env[`${provider}_API_KEY`];
    if (apiKey) {
      console.log(`\n${provider}設定:`);
      console.log(`- API URL: ${process.env[`${provider}_API_URL`] || 'デフォルト'}`);
      console.log(`- デフォルトモデル: ${process.env[`${provider}_DEFAULT_MODEL`] || 'undefined'}`);
      console.log(
        `- フォールバックモデル: ${process.env[`${provider}_FALLBACK_MODEL`] || 'undefined'}`
      );
    }
  });

  console.log('\n');
}

// メイン処理
function main() {
  console.log(
    `コマンド: ${command}, 環境: ${environment}${configFile ? ', 設定ファイル: ' + configFile : ''}`
  );

  // 設定ファイルが指定されている場合は環境ファイルのデフォルトをlocalに
  const defaultEnv = configFile ? 'local' : 'preview';

  // 引数の環境名をCloudflare Pages互換にマッピング
  const mappedEnv = environment === 'development' ? 'preview' : environment;

  // 環境が有効かチェック (設定ファイルが指定されている場合はスキップ)
  if (!configFile && !envFiles[mappedEnv]) {
    console.error(`エラー: 無効な環境名です: ${mappedEnv}`);
    console.error('有効な環境名: production, preview, local');
    process.exit(1);
  }

  // 環境別の.envファイルを読み込み（設定ファイルが指定されている場合はlocal）
  loadEnvFile(envFiles[configFile ? 'local' : mappedEnv]);

  // コマンド別の処理
  switch (command) {
    case 'dev':
      // 設定ファイルが指定されている場合はそれを使用
      if (configFile) {
        runWranglerCommand('pages dev', null, configFile);
      } else {
        // ローカル開発時はdevelopment環境を使用
        runWranglerCommand('pages dev', mappedEnv);
      }
      break;

    case 'deploy':
      // 設定ファイルが指定されている場合はエラー
      if (configFile) {
        console.error('デプロイ時に設定ファイルを直接指定することはできません。');
        console.error('代わりに --env=production または --env=preview を使用してください。');
        process.exit(1);
      }
      runWranglerCommand('pages deploy ./out --project-name=automationa-tools', mappedEnv);
      break;

    case 'tail':
      if (configFile) {
        console.error('ログテイル時に設定ファイルを直接指定することはできません。');
        process.exit(1);
      }
      runWranglerCommand('tail', mappedEnv);
      break;

    case 'db':
      if (configFile) {
        // ローカルDB用の特別なコマンド
        runWranglerCommand(`d1 execute ${dbNames['local']} --local --json`, 'development');
      } else {
        runWranglerCommand(`d1 execute ${dbNames[mappedEnv]} --json`, mappedEnv);
      }
      break;

    case 'llm-config':
      printLLMConfig();
      break;

    default:
      console.log('使用方法: node wrangler-helper.js <コマンド> [環境]');
      console.log('または: node wrangler-helper.js --mode=<コマンド> --env=[環境]');
      console.log('または: node wrangler-helper.js --mode=<コマンド> --config=[設定ファイル]');
      console.log('コマンド:');
      console.log('  dev     - ローカル開発サーバーを起動');
      console.log('  deploy  - ページをデプロイ');
      console.log('  tail    - ログを表示');
      console.log('  db      - D1データベースシェルを起動');
      console.log('  llm-config - LLM設定を表示');
      console.log('環境:');
      console.log('  preview     - 開発環境（旧development）');
      console.log('  production  - 本番環境');
      console.log('  local       - ローカル環境（.env.localを使用）');
      console.log('設定ファイル:');
      console.log('  --config=wrangler-dev.toml - ローカル開発用設定ファイル');
      break;
  }
}

main();
