#!/usr/bin/env node

import { Octokit } from 'octokit';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { exec } from 'child_process';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { createGunzip } from 'zlib';
// ESMでのadm-zipのインポート
import AdmZipModule from 'adm-zip';
import iconv from 'iconv-lite';

// promisifyの設定
const execPromise = promisify(exec);
const pipelinePromise = promisify(pipeline);

// __dirnameの代替（ESMでは直接使えないため）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数のロード（ESM対応）
// .envファイルのパス
const envPath = path.resolve(process.cwd(), '.env');
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envDevelopmentPath = path.resolve(process.cwd(), '.env.development');

// .envファイルが存在すれば読み込む
if (fs.existsSync(envPath)) {
  console.log(`.envファイルを読み込みました: ${envPath}`);
  dotenv.config({ path: envPath });
}

// .env.localファイルが存在すれば読み込む（.envより優先）
if (fs.existsSync(envLocalPath)) {
  console.log(`.env.localファイルを読み込みました: ${envLocalPath}`);
  dotenv.config({ path: envLocalPath, override: true });
}

// .env.developmentファイルが存在すれば読み込む（開発環境用）
if (fs.existsSync(envDevelopmentPath)) {
  console.log(`.env.developmentファイルを読み込みました: ${envDevelopmentPath}`);
  dotenv.config({ path: envDevelopmentPath, override: true });
}

// GitHub API関連の設定
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER =
  process.env.GITHUB_OWNER ||
  process.env.GITHUB_REPOSITORY_OWNER ||
  'daishiman';
const REPO =
  process.env.GITHUB_REPO ||
  process.env.GITHUB_REPOSITORY_NAME ||
  'automation-tools';
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'github-actions-results';
const LOGS_DIR = path.join(OUTPUT_DIR, 'logs');

// 環境変数の設定状況をログに出力（デバッグ用、トークンの一部を隠す）
console.log('環境変数の設定状況:');
console.log(`GITHUB_TOKEN: ${GITHUB_TOKEN ? '設定済み（非表示）' : '未設定'}`);
console.log(`GITHUB_OWNER/GITHUB_REPOSITORY_OWNER: ${OWNER}`);
console.log(`GITHUB_REPO/GITHUB_REPOSITORY_NAME: ${REPO}`);
console.log(`OUTPUT_DIR: ${OUTPUT_DIR}`);
console.log(`DOWNLOAD_LOGS: ${process.env.DOWNLOAD_LOGS || 'false'}`);

// 統合ログファイル
const MERGED_LOG_FILE = path.join(OUTPUT_DIR, 'merged-actions-log.txt');
let mergedLogStream;

// コンソール出力をファイルにも記録するための設定
const CONSOLE_LOG_FILE = path.join(OUTPUT_DIR, 'execution-log.txt');
let logStream;

// 引数の解析
const args = process.argv.slice(2);
const workflowId = args[0]; // ワークフローID または 'all'
const limit = parseInt(args[1], 10) || 20; // 取得する実行結果の数（デフォルト20件）

// オリジナルのconsoleメソッドを保存
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// コンソールログを設定する関数
function setupConsoleLogging() {
  // 出力ディレクトリの作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // ログファイルストリームを開く
  logStream = fs.createWriteStream(CONSOLE_LOG_FILE);

  // console.logをオーバーライド
  console.log = function () {
    // オリジナルのconsole.logを呼び出し
    originalConsoleLog.apply(console, arguments);

    // 引数を文字列化してログファイルに書き込み
    const text =
      Array.from(arguments)
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ') + '\n';
    logStream.write(text);
  };

  // console.errorをオーバーライド
  console.error = function () {
    // オリジナルのconsole.errorを呼び出し
    originalConsoleError.apply(console, arguments);

    // エラーを赤色表示するためのANSIエスケープコードを除去
    const text =
      '[ERROR] ' +
      Array.from(arguments)
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ') +
      '\n';
    logStream.write(text);
  };

  console.log(`コンソール出力の記録を開始しました: ${CONSOLE_LOG_FILE}`);
}

// コンソールログを後片付けする関数
function cleanupConsoleLogging() {
  // オリジナルのconsole関数を復元
  console.log = originalConsoleLog;
  console.error = originalConsoleError;

  // ログストリームを閉じる
  if (logStream) {
    logStream.end();
    console.log(`コンソール出力の記録を終了しました: ${CONSOLE_LOG_FILE}`);
  }
}

// GitHub APIクライアントの初期化
let octokit;
try {
  // トークンが設定されている場合は認証付きでOctokitを初期化
  if (GITHUB_TOKEN) {
    octokit = new Octokit({
      auth: GITHUB_TOKEN,
    });
    console.log('GitHub API: 認証付きでクライアントを初期化しました');
  } else {
    // トークンが設定されていない場合は認証なしでOctokitを初期化
    octokit = new Octokit();
    console.warn('GitHub API: 認証なしでクライアントを初期化しました（API制限があります）');
  }
} catch (error) {
  console.error('GitHub APIクライアントの初期化に失敗しました:', error.message);
  process.exit(1);
}

// テストモードかどうかを判定する関数
function isTestMode() {
  return process.argv.includes('--test-mode');
}

/**
 * GitHub Actionsのワークフロー一覧を取得
 */
async function getWorkflows() {
  try {
    // テストモードの場合はダミーデータを返す
    if (isTestMode()) {
      return [
        { id: 1, name: 'テスト用ワークフロー1', path: '.github/workflows/test1.yml', state: 'active' },
        { id: 2, name: 'テスト用ワークフロー2', path: '.github/workflows/test2.yml', state: 'active' },
      ];
    }

    console.log(`GitHub APIリクエスト: ワークフロー一覧を取得します (owner: ${OWNER}, repo: ${REPO})`);
    const response = await octokit.rest.actions.listRepoWorkflows({
      owner: OWNER,
      repo: REPO,
      per_page: 100, // ページあたりの最大数を指定
    });

    // ワークフローの一覧を返す（ページネーションは省略）
    return response.data.workflows;
  } catch (error) {
    console.error('ワークフロー一覧の取得に失敗しました:', error.message);

    if (error.status === 404) {
      console.error(`リポジトリが見つかりません: ${OWNER}/${REPO}`);
      console.error('リポジトリ名と所有者名を確認してください。');
    } else if (error.status === 401) {
      console.error('認証エラー: GitHubトークンを確認してください。');
      console.error('GitHub Personal Access Tokenが有効かどうか、必要なスコープ（repo, workflow）が付与されているかを確認してください。');
    } else if (error.status === 403) {
      console.error('アクセス拒否: APIレート制限に達したか、権限が不足しています。');
    }

    // テストモードに自動切り替え
    console.log('エラーが発生したため、テストモードに切り替えます...');
    return [
      { id: 1, name: 'テスト用ワークフロー1', path: '.github/workflows/test1.yml', state: 'active' },
      { id: 2, name: 'テスト用ワークフロー2', path: '.github/workflows/test2.yml', state: 'active' },
    ];
  }
}

/**
 * 特定のワークフローの実行結果を取得
 */
async function getWorkflowRuns(workflowId) {
  try {
    const response = await octokit.rest.actions.listWorkflowRuns({
      owner: OWNER,
      repo: REPO,
      workflow_id: workflowId,
      per_page: limit,
    });

    // 実行結果を返す（ページネーションは省略）
    return response.data.workflow_runs;
  } catch (error) {
    console.error(`ワークフロー(ID: ${workflowId})の実行結果取得に失敗しました:`, error.message);
    return [];
  }
}

/**
 * ワークフロー実行の詳細情報（ジョブとステップ）を取得
 */
async function getWorkflowRunDetails(runId) {
  try {
    // ジョブ情報の取得
    const jobsResponse = await octokit.rest.actions.listJobsForWorkflowRun({
      owner: OWNER,
      repo: REPO,
      run_id: runId,
      per_page: 100, // ページあたりの最大数を指定
    });

    // ジョブ一覧を返す（ページネーションは省略）
    return jobsResponse.data.jobs;
  } catch (error) {
    console.error(`実行ID: ${runId}の詳細取得に失敗しました:`, error.message);
    return [];
  }
}

// 統合ログの初期化
function initMergedLog() {
  // 出力ディレクトリの作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }

  // 既存のファイルがあれば削除
  if (fs.existsSync(MERGED_LOG_FILE)) {
    fs.unlinkSync(MERGED_LOG_FILE);
  }

  // 新しいログファイルを作成
  mergedLogStream = fs.createWriteStream(MERGED_LOG_FILE);

  // ヘッダー情報を書き込む
  const now = new Date();
  mergedLogStream.write(`# GitHub Actions 実行結果\n`);
  mergedLogStream.write(`リポジトリ: ${OWNER}/${REPO}\n`);
  mergedLogStream.write(`実行日時: ${now.toISOString()}\n\n`);
}

// 統合ログにセクションを追加
function appendToMergedLog(title, content) {
  if (!mergedLogStream) return;

  mergedLogStream.write(`\n\n==================================================\n`);
  mergedLogStream.write(`## ${title}\n`);
  mergedLogStream.write(`==================================================\n\n`);
  mergedLogStream.write(content);
}

// 統合ログを閉じる
function closeMergedLog() {
  if (mergedLogStream) {
    mergedLogStream.end();
    console.log(`すべての実行結果を1つのファイルにまとめました: ${MERGED_LOG_FILE}`);
  }
}

/**
 * ワークフロー実行のログをダウンロード
 */
async function downloadWorkflowLogs(runId, workflowName, runNumber, retries = 2) {
  try {
    const response = await octokit.rest.actions.downloadWorkflowRunLogs({
      owner: OWNER,
      repo: REPO,
      run_id: runId,
    });

    // 出力ディレクトリの作成
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    // ログの保存（ZIP形式）
    const zipFilename = `workflow-run-${runId}.zip`;
    const zipPath = path.join(OUTPUT_DIR, zipFilename);

    // レスポンスの詳細をログに出力（デバッグ用）
    console.log(`ログダウンロードAPIのレスポンス:`, JSON.stringify({
      status: response.status,
      headers: response.headers,
      hasUrl: !!response.url,
    }));

    // URLが返された場合、fetch APIを使って直接ダウンロード
    if (response.url) {
      console.log(`直接URLからログをダウンロードします: ${response.url}`);
      try {
        const fetch = (await import('node-fetch')).default;
        const fetchResponse = await fetch(response.url);
        if (!fetchResponse.ok) {
          throw new Error(`HTTPエラー: ${fetchResponse.status}`);
        }

        // バッファとしてダウンロード
        const buffer = await fetchResponse.buffer();
        fs.writeFileSync(zipPath, buffer);
        console.log(`ログを保存しました: ${zipPath}`);

        // ログを解凍してテキストファイルとして保存するオプション
        if (process.env.EXTRACT_LOGS === 'true') {
          try {
            const AdmZip = AdmZipModule;
            const zip = new AdmZip(zipPath);
            const extractPath = path.join(LOGS_DIR, `run-${runId}`);

            if (!fs.existsSync(extractPath)) {
              fs.mkdirSync(extractPath, { recursive: true });
            }

            zip.extractAllTo(extractPath, true);
            console.log(`ログを解凍しました: ${extractPath}`);
          } catch (extractError) {
            console.error(`ログの解凍に失敗しました:`, extractError.message);
          }
        }

        return { zipPath, status: 'success' };
      } catch (fetchError) {
        console.error(`直接ダウンロードに失敗しました:`, fetchError.message);

        // リトライ回数が残っている場合、再試行
        if (retries > 0) {
          console.log(`ダウンロードを再試行します... (残り ${retries} 回)`);
          return await downloadWorkflowLogs(runId, workflowName, runNumber, retries - 1);
        }

        throw fetchError;
      }
    } else {
      console.error(`サポートされていないレスポンス形式です:`, JSON.stringify(response, null, 2));
      throw new Error('サポートされていないレスポンス形式');
    }
  } catch (error) {
    console.error(`ワークフローのログ取得に失敗しました(実行ID: ${runId}):`, error.message);

    // エラー詳細を出力（デバッグ用）
    if (error.status) {
      console.error(`  ステータスコード: ${error.status}`);
    }
    if (error.response) {
      console.error(`  レスポンス: ${JSON.stringify(error.response.data)}`);
    }

    // 認証エラーの場合は特別なメッセージを表示
    if (error.status === 401) {
      console.error(`  認証エラー: GitHub Tokenが正しく設定されていないか、必要な権限がありません。`);
      console.error(`  必要なスコープ: repo, workflow`);
      console.error(`  GitHub Personal Access Tokenの設定方法を確認してください。`);
    } else if (error.status === 404) {
      console.error(`  リソースが見つかりません: リポジトリ名、所有者名、またはワークフローIDを確認してください。`);
      console.error(`  現在の設定: OWNER=${OWNER}, REPO=${REPO}, RUN_ID=${runId}`);
    } else if (error.status === 403) {
      console.error(`  アクセス拒否: APIレート制限に達したか、権限が不足しています。`);
    } else if (error.status === 410) {
      console.error(`  リソースが利用できなくなりました: ログが既に期限切れになっている可能性があります。`);
      console.error(`  GitHub Actionsのログは90日間のみ保持されます。`);
    }

    // リトライ回数が残っている場合、再試行
    if (retries > 0 && error.status !== 401 && error.status !== 404) {
      console.log(`3秒後にダウンロードを再試行します... (残り ${retries} 回)`);
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3秒待機
      return await downloadWorkflowLogs(runId, workflowName, runNumber, retries - 1);
    }

    throw error;
  }
}

/**
 * 結果をJSONファイルに保存
 */
function saveResultsToFile(data, filename) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`結果を保存しました: ${filePath}`);
  return filePath;
}

/**
 * メイン関数
 */
async function main() {
  try {
    // コンソールログのセットアップ
    setupConsoleLogging();

    // 統合ログの初期化
    initMergedLog();

    console.log('GitHub Actions実行結果の取得を開始します...');

    // テストモードの確認
    const testMode = isTestMode();

    // リポジトリ情報の表示
    console.log(`リポジトリ: ${OWNER}/${REPO}`);

    // トークンチェック（テストモード以外）
    if (!GITHUB_TOKEN && !testMode) {
      console.error('エラー: GITHUB_TOKENが設定されていません。');
      console.error('環境変数またはdotenvファイルにGITHUB_TOKENを設定してください。');
      console.error('以下の方法で環境変数を設定できます:');
      console.error('1. .envファイルを作成してGITHUB_TOKEN=トークン値 を記載');
      console.error('2. 実行前に環境変数を設定: export GITHUB_TOKEN=トークン値');
      console.error('3. コマンド実行時に指定: GITHUB_TOKEN=トークン値 pnpm gh:actions:fetch:all');
      console.error('または --test-mode オプションを使用してテストデータで実行してください。');

      // テストモードを自動的に有効化
      console.log('テストモードに自動的に切り替えます...');
      process.argv.push('--test-mode');
    }

    // テストモード時の処理
    if (isTestMode()) {
      console.log('テストモードで実行しています。ダミーデータを使用します。');

      // ダミーワークフロー情報の作成
      const dummyWorkflows = [
        { id: 1, name: 'テスト用ワークフロー1', path: '.github/workflows/test1.yml', state: 'active' },
        { id: 2, name: 'テスト用ワークフロー2', path: '.github/workflows/test2.yml', state: 'active' },
      ];

      console.log(`${dummyWorkflows.length}個のテストワークフローを生成しました。`);

      // ダミーデータを保存
      saveResultsToFile(dummyWorkflows, 'test-workflows.json');

      // ダミー実行結果の作成
      const dummyResults = dummyWorkflows.map(workflow => ({
        workflow_name: workflow.name,
        workflow_id: workflow.id,
        run_id: 1000 + workflow.id,
        run_number: 1,
        event: 'push',
        status: 'completed',
        conclusion: 'success',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        jobs: [
          {
            name: 'テストジョブ',
            status: 'completed',
            conclusion: 'success',
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            steps: [
              {
                name: 'チェックアウト',
                status: 'completed',
                conclusion: 'success',
                number: 1
              },
              {
                name: 'テスト実行',
                status: 'completed',
                conclusion: 'success',
                number: 2
              }
            ]
          }
        ]
      }));

      // テスト結果を保存
      saveResultsToFile(dummyResults, 'test-workflow-results.json');
      console.log('テストデータを保存しました: github-actions-results/test-workflow-results.json');

      // 統合ログに追加
      appendToMergedLog('テストモード情報', 'テストモードで実行しました。実際のGitHub APIは使用していません。');

      // 後処理
      closeMergedLog();
      cleanupConsoleLogging();
      return;
    }

    // OctokitクライアントがGITHUB_TOKENを使用しているか再確認
    if (!GITHUB_TOKEN) {
      console.warn('警告: GitHub API認証が設定されていません。認証なしでAPIリクエストを実行します。');
      console.warn('レート制限が厳しく適用される可能性があります。');
    }

    // 通常モード: ワークフロー一覧の取得
    console.log('GitHub APIにリクエストを送信しています...');
    const workflows = await getWorkflows();
    console.log(`${workflows.length}個のワークフローが見つかりました。`);

    // ワークフロー一覧をJSONファイルに保存
    saveResultsToFile(workflows, 'workflows.json');

    // ワークフロー一覧を統合ログに追加
    const workflowSummary = workflows.map((w) => `- ${w.name} (ID: ${w.id})`).join('\n');
    appendToMergedLog(
      'ワークフロー一覧',
      `${workflows.length}個のワークフローが見つかりました。\n\n${workflowSummary}`
    );

    const results = [];

    // すべてのワークフローまたは特定のワークフローの処理
    if (workflowId === 'all') {
      // すべてのワークフローの実行結果を取得
      for (const workflow of workflows) {
        console.log(`ワークフロー「${workflow.name}」(ID: ${workflow.id})の実行結果を取得中...`);
        const runs = await getWorkflowRuns(workflow.id);

        if (runs.length === 0) {
          console.log(`  ワークフロー「${workflow.name}」の実行履歴がありません`);
          continue;
        }

        for (const run of runs) {
          const jobs = await getWorkflowRunDetails(run.id);

          // ログのダウンロード（エラーがある場合は常に実行）
          if (process.env.DOWNLOAD_LOGS === 'true' || run.conclusion === 'failure') {
            try {
              await downloadWorkflowLogs(run.id, workflow.name, run.run_number);
            } catch (logError) {
              console.error(`  ログのダウンロードに失敗しました (ID: ${run.id}): ${logError.message}`);
            }
          }

          // 重要な情報だけを抽出
          results.push({
            workflow_name: workflow.name,
            workflow_id: workflow.id,
            run_id: run.id,
            run_number: run.run_number,
            event: run.event,
            status: run.status,
            conclusion: run.conclusion,
            created_at: run.created_at,
            updated_at: run.updated_at,
            jobs: jobs.map((job) => ({
              name: job.name,
              status: job.status,
              conclusion: job.conclusion,
              started_at: job.started_at,
              completed_at: job.completed_at,
              steps: job.steps ? job.steps.map((step) => ({
                name: step.name,
                status: step.status,
                conclusion: step.conclusion,
                number: step.number,
              })) : [],
            })),
          });
        }
      }
    } else {
      // 特定のワークフローの実行結果を取得
      const workflowInfo = workflows.find((w) => w.id.toString() === workflowId);
      if (!workflowInfo) {
        console.error(`ワークフローID: ${workflowId}が見つかりません。`);
        process.exit(1);
      }

      console.log(`ワークフロー「${workflowInfo.name}」(ID: ${workflowId})の実行結果を取得中...`);
      const runs = await getWorkflowRuns(workflowId);

      if (runs.length === 0) {
        console.log(`  ワークフロー「${workflowInfo.name}」の実行履歴がありません`);
      } else {
        for (const run of runs) {
          const jobs = await getWorkflowRunDetails(run.id);

          // ログのダウンロード（エラーがある場合は常に実行）
          if (process.env.DOWNLOAD_LOGS === 'true' || run.conclusion === 'failure') {
            try {
              await downloadWorkflowLogs(run.id, workflowInfo.name, run.run_number);
            } catch (logError) {
              console.error(`  ログのダウンロードに失敗しました (ID: ${run.id}): ${logError.message}`);
            }
          }

          // 重要な情報だけを抽出
          results.push({
            workflow_name: workflowInfo.name,
            workflow_id: workflowInfo.id,
            run_id: run.id,
            run_number: run.run_number,
            event: run.event,
            status: run.status,
            conclusion: run.conclusion,
            created_at: run.created_at,
            updated_at: run.updated_at,
            jobs: jobs.map((job) => ({
              name: job.name,
              status: job.status,
              conclusion: job.conclusion,
              started_at: job.started_at,
              completed_at: job.completed_at,
              steps: job.steps ? job.steps.map((step) => ({
                name: step.name,
                status: step.status,
                conclusion: step.conclusion,
                number: step.number,
              })) : [],
            })),
          });
        }
      }
    }

    // 結果の概要を統合ログに追加
    if (results.length > 0) {
      const runSummary = results
        .map(
          (run) =>
            `- ワークフロー: ${run.workflow_name}, 実行番号: ${run.run_number}, 結果: ${
              run.conclusion || run.status
            }, イベント: ${run.event}`
        )
        .join('\n');

      appendToMergedLog(
        '実行結果の概要',
        `${results.length}件の実行結果を取得しました。\n\n${runSummary}`
      );

      // 結果の保存
      const filename =
        workflowId === 'all' ? 'all-workflow-results.json' : `workflow-${workflowId}-results.json`;
      saveResultsToFile(results, filename);
      console.log(`${results.length}件の実行結果を取得しました。`);
    } else {
      appendToMergedLog('実行結果', '該当する実行結果が見つかりませんでした。');
      console.log('該当する実行結果が見つかりませんでした。');

      if (workflowId === 'all') {
        // 空の結果でもファイルを生成
        saveResultsToFile([], 'all-workflow-results.json');
      }
    }

    // 統合ログを閉じる
    closeMergedLog();
  } finally {
    // コンソールログの後片付け
    cleanupConsoleLogging();
  }
}

// スクリプトの実行
main().catch((error) => {
  console.error('エラーが発生しました:', error);
  if (mergedLogStream) {
    appendToMergedLog(
      '実行エラー',
      `スクリプトの実行中にエラーが発生しました: ${error.message}\n${error.stack}`
    );
    closeMergedLog();
  }
  cleanupConsoleLogging(); // エラー時にもログをクリーンアップ
  process.exit(1);
});
