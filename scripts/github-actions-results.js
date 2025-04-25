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
dotenv.config();

// GitHub API関連の設定
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER =
  process.env.GITHUB_OWNER ||
  process.env.GITHUB_REPOSITORY_OWNER ||
  'デフォルトのオーナー名を設定してください';
const REPO =
  process.env.GITHUB_REPO ||
  process.env.GITHUB_REPOSITORY_NAME ||
  'デフォルトのリポジトリ名を設定してください';
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'github-actions-results';
const LOGS_DIR = path.join(OUTPUT_DIR, 'logs');

// 統合ログファイル
const MERGED_LOG_FILE = path.join(OUTPUT_DIR, 'merged-actions-log.txt');
let mergedLogStream;

// コンソール出力をファイルにも記録するための設定
const CONSOLE_LOG_FILE = path.join(OUTPUT_DIR, 'execution-log.txt');
let logStream;

// 引数の解析
const args = process.argv.slice(2);
const workflowId = args[0]; // ワークフローID または 'all'
const limit = parseInt(args[1], 10) || 10; // 取得する実行結果の数（デフォルト10件）

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
const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

/**
 * GitHub Actionsのワークフロー一覧を取得
 */
async function getWorkflows() {
  try {
    const response = await octokit.rest.actions.listRepoWorkflows({
      owner: OWNER,
      repo: REPO,
    });
    return response.data.workflows;
  } catch (error) {
    console.error('ワークフロー一覧の取得に失敗しました:', error.message);
    if (error.status === 404) {
      console.error('リポジトリが見つからないか、アクセス権限がありません。');
    } else if (error.status === 401) {
      console.error('認証エラー: GitHubトークンを確認してください。');
    }
    process.exit(1);
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
    });

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
async function downloadWorkflowLogs(runId, workflowName, runNumber) {
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

    // レスポンスの処理方法をチェック
    const responseData = response.data;

    let logContent = '';
    let logSummary = `ワークフロー: ${workflowName} (実行番号: ${runNumber}, ID: ${runId})\n`;

    // Octokitのレスポンスがバイナリデータかチェック
    if (responseData && responseData.arrayBuffer) {
      // ArrayBufferの場合
      const buffer = await responseData.arrayBuffer();
      fs.writeFileSync(zipPath, Buffer.from(buffer));
      console.log(`ログを保存しました: ${zipPath}`);

      // 一時的な解凍ディレクトリを作成
      const tempExtractDir = path.join(LOGS_DIR, `temp-extract-${runId}`);
      if (fs.existsSync(tempExtractDir)) {
        // 既存のディレクトリを削除
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempExtractDir, { recursive: true });

      try {
        // unzipを使用する代わりにnode-unzipを使ってJavaScriptで解凍
        const AdmZip = AdmZipModule;
        const zip = new AdmZip(zipPath);

        // ZIPファイルの内容を取得し、統合ログに追加
        const zipEntries = zip.getEntries();

        // まずジョブ名のリストを取得（ファイル名からジョブ名を抽出）
        const jobNames = new Set();
        zipEntries.forEach((entry) => {
          if (entry.entryName.endsWith('.txt') && !entry.isDirectory) {
            // エントリ名からジョブ名を抽出（パスの最後の部分から.txtを除いた部分）
            const nameParts = entry.entryName.split('/');
            const fileName = nameParts[nameParts.length - 1];
            // ファイル名から数字とアンダースコアを削除してジョブ名を得る
            const jobName = fileName.replace(/^\d+_/, '').replace(/\.txt$/, '');
            jobNames.add(jobName);
          }
        });

        // ジョブごとにログを抽出して統合
        for (const jobName of jobNames) {
          logContent += `\n--- JOB: ${jobName} ---\n\n`;

          // このジョブに関連するすべてのファイルを見つける
          const jobFiles = zipEntries.filter(
            (entry) =>
              entry.entryName.endsWith('.txt') &&
              !entry.isDirectory &&
              entry.entryName.includes(jobName)
          );

          // ファイルをステップ番号順にソート
          jobFiles.sort((a, b) => {
            const numA = parseInt(a.entryName.match(/\/(\d+)_/)?.[1] || '0');
            const numB = parseInt(b.entryName.match(/\/(\d+)_/)?.[1] || '0');
            return numA - numB;
          });

          // 各ファイルの内容を読み取って追加
          for (const file of jobFiles) {
            try {
              // ファイル内容をUTF-8でデコード
              let content;
              try {
                content = file.getData().toString('utf8');
              } catch (encodingError) {
                // UTF-8デコードに失敗した場合、他のエンコーディングを試みる
                console.warn(
                  `UTF-8での読み取りに失敗しました: ${file.entryName}、他のエンコーディングを試みます`
                );
                try {
                  content = iconv.decode(file.getData(), 'shift-jis');
                } catch (iconvError) {
                  console.error(`他のエンコーディングでも失敗しました: ${iconvError.message}`);
                  content = file.getData().toString('binary');
                }
              }

              // ステップ名を抽出
              const nameParts = file.entryName.split('/');
              const fileName = nameParts[nameParts.length - 1];
              // ファイル名に問題がある場合のサニタイズ
              let stepName = fileName.replace(/^\d+_/, '').replace(/\.txt$/, '');

              // 不正なステップ名をサニタイズ
              if (!stepName || /[\u{0000}-\u{001F}\u{FFFD}]|\u{FFFD}/u.test(stepName)) {
                stepName = `ステップ ${jobFiles.indexOf(file) + 1}`;
              }

              logContent += `--- STEP: ${stepName} ---\n`;
              logContent += content;
              logContent += '\n\n';
            } catch (error) {
              console.error(`ファイル ${file.entryName} の読み取りに失敗しました:`, error);
              logContent += `ERROR: ファイル ${file.entryName} の読み取りに失敗しました: ${error.message}\n\n`;
            }
          }
        }
      } catch (error) {
        console.error(`ZIPファイルの処理中にエラーが発生しました:`, error);
        logSummary += `ZIPファイル処理エラー: ${error.message}\n`;
        logContent += `ZIPファイルの処理に失敗しました: ${error.message}\n`;

        // 代替手段でログ内容を取得
        const alternativeLog = await getAlternativeLogsContent(runId);
        if (alternativeLog && alternativeLog.logContents) {
          logContent += formatAlternativeLogContents(alternativeLog.logContents);
        }
      }
    } else if (responseData && typeof responseData.pipe === 'function') {
      // Streamの場合
      const dest = fs.createWriteStream(zipPath);
      await new Promise((resolve, reject) => {
        try {
          responseData.pipe(dest);
          responseData.on('error', (error) => {
            console.error(`ログのダウンロードに失敗しました:`, error);
            logSummary += `ダウンロードエラー: ${error.message}\n`;
            reject(error);
          });
          dest.on('finish', async () => {
            console.log(`ログを保存しました: ${zipPath}`);

            // ファイルが保存された後、それを処理する
            try {
              // AdmZipを使用して解凍
              const AdmZip = AdmZipModule;
              const zip = new AdmZip(zipPath);

              // ZIPファイルの内容を解析
              const zipEntries = zip.getEntries();

              // ジョブ名のリストを取得
              const jobNames = new Set();
              zipEntries.forEach((entry) => {
                if (entry.entryName.endsWith('.txt') && !entry.isDirectory) {
                  const nameParts = entry.entryName.split('/');
                  const fileName = nameParts[nameParts.length - 1];
                  const jobName = fileName.replace(/^\d+_/, '').replace(/\.txt$/, '');
                  jobNames.add(jobName);
                }
              });

              // ジョブごとにログを抽出
              for (const jobName of jobNames) {
                logContent += `\n--- JOB: ${jobName} ---\n\n`;

                // このジョブに関連するすべてのファイルを見つける
                const jobFiles = zipEntries.filter(
                  (entry) =>
                    entry.entryName.endsWith('.txt') &&
                    !entry.isDirectory &&
                    entry.entryName.includes(jobName)
                );

                // ファイルをステップ番号順にソート
                jobFiles.sort((a, b) => {
                  const numA = parseInt(a.entryName.match(/\/(\d+)_/)?.[1] || '0');
                  const numB = parseInt(b.entryName.match(/\/(\d+)_/)?.[1] || '0');
                  return numA - numB;
                });

                // 各ファイルの内容を読み取って追加
                for (const file of jobFiles) {
                  try {
                    const content = file.getData().toString('utf8');

                    const nameParts = file.entryName.split('/');
                    const fileName = nameParts[nameParts.length - 1];
                    let stepName = fileName.replace(/^\d+_/, '').replace(/\.txt$/, '');

                    // 不正なステップ名をサニタイズ
                    if (!stepName || /[\u{0000}-\u{001F}\u{FFFD}]|\u{FFFD}/u.test(stepName)) {
                      stepName = `ステップ ${jobFiles.indexOf(file) + 1}`;
                    }

                    logContent += `--- STEP: ${stepName} ---\n`;
                    logContent += content;
                    logContent += '\n\n';
                  } catch (error) {
                    console.error(`ファイル ${file.entryName} の読み取りに失敗しました:`, error);
                    logContent += `ERROR: ファイル ${file.entryName} の読み取りに失敗しました: ${error.message}\n\n`;
                  }
                }
              }
            } catch (zipError) {
              console.error(`ZIPファイルの処理中にエラーが発生しました:`, zipError);
              logSummary += `ZIPファイル処理エラー: ${zipError.message}\n`;
              logContent += `ZIPファイルの処理に失敗しました: ${zipError.message}\n`;

              // 代替手段でログ内容を取得
              const alternativeLog = await getAlternativeLogsContent(runId);
              if (alternativeLog && alternativeLog.logContents) {
                logContent += formatAlternativeLogContents(alternativeLog.logContents);
              }
            }

            resolve(zipPath);
          });
        } catch (error) {
          console.error(`responseData.pipeの実行中にエラーが発生しました:`, error);
          console.log(`responseDataの型: ${typeof responseData}`);
          if (responseData) {
            console.log(`responseDataのプロパティ:`, Object.keys(responseData));
          }
          logSummary += `ストリーム処理エラー: ${error.message}\n`;
          dest.end();
          reject(error);
        }
      });
    } else if (response.url) {
      // URLが返された場合、fetch APIを使って直接ダウンロード
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

        // ZipファイルをAdmZipで処理
        try {
          const AdmZip = AdmZipModule;
          const zip = new AdmZip(zipPath);

          // ZIPファイルの内容を解析
          const zipEntries = zip.getEntries();

          // ジョブ名のリストを取得
          const jobNames = new Set();
          zipEntries.forEach((entry) => {
            if (entry.entryName.endsWith('.txt') && !entry.isDirectory) {
              const nameParts = entry.entryName.split('/');
              const fileName = nameParts[nameParts.length - 1];
              const jobName = fileName.replace(/^\d+_/, '').replace(/\.txt$/, '');
              jobNames.add(jobName);
            }
          });

          // ジョブごとにログを抽出
          for (const jobName of jobNames) {
            logContent += `\n--- JOB: ${jobName} ---\n\n`;

            // このジョブに関連するすべてのファイルを見つける
            const jobFiles = zipEntries.filter(
              (entry) =>
                entry.entryName.endsWith('.txt') &&
                !entry.isDirectory &&
                entry.entryName.includes(jobName)
            );

            // ファイルをステップ番号順にソート
            jobFiles.sort((a, b) => {
              const numA = parseInt(a.entryName.match(/\/(\d+)_/)?.[1] || '0');
              const numB = parseInt(b.entryName.match(/\/(\d+)_/)?.[1] || '0');
              return numA - numB;
            });

            // 各ファイルの内容を読み取って追加
            for (const file of jobFiles) {
              try {
                const content = file.getData().toString('utf8');

                const nameParts = file.entryName.split('/');
                const fileName = nameParts[nameParts.length - 1];
                let stepName = fileName.replace(/^\d+_/, '').replace(/\.txt$/, '');

                // 不正なステップ名をサニタイズ
                if (!stepName || /[\u{0000}-\u{001F}\u{FFFD}]|\u{FFFD}/u.test(stepName)) {
                  stepName = `ステップ ${jobFiles.indexOf(file) + 1}`;
                }

                logContent += `--- STEP: ${stepName} ---\n`;
                logContent += content;
                logContent += '\n\n';
              } catch (error) {
                console.error(`ファイル ${file.entryName} の読み取りに失敗しました:`, error);
                logContent += `ERROR: ファイル ${file.entryName} の読み取りに失敗しました: ${error.message}\n\n`;
              }
            }
          }
        } catch (zipError) {
          console.error(`ZIPファイルの処理中にエラーが発生しました:`, zipError);
          logSummary += `ZIPファイル処理エラー: ${zipError.message}\n`;
          logContent += `ZIPファイルの処理に失敗しました: ${zipError.message}\n`;

          // 代替手段でログ内容を取得
          const alternativeLog = await getAlternativeLogsContent(runId);
          if (alternativeLog && alternativeLog.logContents) {
            logContent += formatAlternativeLogContents(alternativeLog.logContents);
          }
        }
      } catch (fetchError) {
        console.error(`直接ダウンロードに失敗しました:`, fetchError);
        logSummary += `直接ダウンロードエラー: ${fetchError.message}\n`;

        // 代替手段に進む
        const alternativeLog = await getAlternativeLogsContent(runId);
        if (alternativeLog && alternativeLog.logContents) {
          logContent += formatAlternativeLogContents(alternativeLog.logContents);
        }
      }
    } else {
      console.error(`サポートされていないレスポンス形式です:`, responseData);
      logSummary += `非対応フォーマット: ${typeof responseData}\n`;

      // 代替手段に進む
      const alternativeLog = await getAlternativeLogsContent(runId);
      if (alternativeLog && alternativeLog.logContents) {
        logContent += formatAlternativeLogContents(alternativeLog.logContents);
      }
    }

    // 最終的な統合ログに追加
    appendToMergedLog(logSummary, logContent);

    return { zipPath, logContent };
  } catch (error) {
    console.error(`ワークフローのログ取得に失敗しました(実行ID: ${runId}):`, error.message);

    let logSummary = `ワークフロー実行 ID: ${runId} - エラー発生\n`;
    let logContent = `ログの取得に失敗しました: ${error.message}\n\n`;

    // 失敗したジョブ情報だけでもJSONファイルとして提供
    try {
      const jobsResponse = await octokit.rest.actions.listJobsForWorkflowRun({
        owner: OWNER,
        repo: REPO,
        run_id: runId,
      });

      const jobs = jobsResponse.data.jobs;
      const logContents = {};

      for (const job of jobs) {
        // 簡易的なジョブ情報を提供
        const jobStatus =
          job.conclusion === 'success' ? '成功' : job.conclusion === 'failure' ? '失敗' : '不明';
        const jobLog = `### ジョブ: ${job.name} (ID: ${job.id})
ステータス: ${jobStatus}
開始時間: ${job.started_at || '不明'}
終了時間: ${job.completed_at || '不明'}

#### ステップ:
${job.steps
  .map((step) => `${step.number}. ${step.name}: ${step.conclusion || step.status}`)
  .join('\n')}

注意: ログの取得に失敗しました。
失敗の詳細はGitHubのActions実行画面で確認してください:
${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${OWNER}/${REPO}/actions/runs/${runId}
`;
        logContents[job.name] = jobLog;

        // ログ内容に追加
        logContent += `\n--- JOB: ${job.name} ---\n\n`;
        logContent += jobLog;
        logContent += '\n\n';
      }

      // 統合ログに追加
      appendToMergedLog(logSummary, logContent);
    } catch (innerError) {
      console.error(`代替情報の取得にも失敗しました:`, innerError.message);
      logContent += `代替情報の取得にも失敗しました: ${innerError.message}\n`;

      // 統合ログに追加
      appendToMergedLog(logSummary, logContent);
    }

    return null;
  }
}

/**
 * 代替方法でログ内容を取得する関数
 */
async function getAlternativeLogsContent(runId) {
  console.log(`代替手段: GitHub REST APIからログを取得します...`);
  try {
    // 直接ログをテキスト形式で取得するために、各ジョブのログを個別に取得
    const jobsResponse = await octokit.rest.actions.listJobsForWorkflowRun({
      owner: OWNER,
      repo: REPO,
      run_id: runId,
    });

    const jobs = jobsResponse.data.jobs;
    const logContents = {};
    let combinedLog = '';

    for (const job of jobs) {
      try {
        console.log(`ジョブ「${job.name}」(ID: ${job.id})のログを取得中...`);

        // ログの内容をモックデータで代用（APIの制限により実際のログは取得できない場合）
        const jobStatus =
          job.conclusion === 'success' ? '成功' : job.conclusion === 'failure' ? '失敗' : '不明';
        const jobLog = `### ジョブ: ${job.name} (ID: ${job.id})
ステータス: ${jobStatus}
開始時間: ${job.started_at || '不明'}
終了時間: ${job.completed_at || '不明'}

#### ステップ:
${job.steps
  .map((step) => `${step.number}. ${step.name}: ${step.conclusion || step.status}`)
  .join('\n')}

注意: GitHubのAPIの制限により、詳細なログは取得できませんでした。
失敗の詳細はGitHubのActions実行画面で確認してください:
${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${OWNER}/${REPO}/actions/runs/${runId}
`;
        logContents[job.name] = jobLog;

        // 統合ログに追加
        combinedLog += `\n\n--- JOB: ${job.name} ---\n\n`;
        combinedLog += jobLog;
      } catch (error) {
        console.error(`ジョブID: ${job.id}のログの取得に失敗しました:`, error.message);
        const errorMessage = `ログの取得に失敗しました: ${error.message}`;
        logContents[job.name] = errorMessage;

        // エラーメッセージも統合ログに追加
        combinedLog += `\n\n--- JOB: ${job.name} - エラー ---\n\n`;
        combinedLog += errorMessage;
      }
    }

    return { logContents, combinedLog };
  } catch (error) {
    console.error(`代替ログ取得方法でも失敗しました:`, error.message);
    return null;
  }
}

/**
 * 代替ログ内容をフォーマットする
 */
function formatAlternativeLogContents(logContents) {
  let result = '';
  for (const jobName in logContents) {
    result += `\n--- JOB: ${jobName} ---\n\n`;
    result += logContents[jobName];
    result += '\n\n';
  }
  return result;
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

    // トークンチェック
    if (!GITHUB_TOKEN) {
      console.error('エラー: GITHUB_TOKENが設定されていません。');
      console.error('環境変数またはdotenvファイルにGITHUB_TOKENを設定してください。');
      process.exit(1);
    }

    // リポジトリ情報の表示
    console.log(`リポジトリ: ${OWNER}/${REPO}`);

    // ワークフロー一覧の取得
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

        for (const run of runs) {
          const jobs = await getWorkflowRunDetails(run.id);

          // ログのダウンロード（エラーがある場合は常に実行）
          let logs = null;
          if (process.env.DOWNLOAD_LOGS === 'true' || run.conclusion === 'failure') {
            logs = await downloadWorkflowLogs(run.id, workflow.name, run.run_number);
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
              steps: job.steps.map((step) => ({
                name: step.name,
                status: step.status,
                conclusion: step.conclusion,
                number: step.number,
              })),
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

      for (const run of runs) {
        const jobs = await getWorkflowRunDetails(run.id);

        // ログのダウンロード（エラーがある場合は常に実行）
        let logs = null;
        if (process.env.DOWNLOAD_LOGS === 'true' || run.conclusion === 'failure') {
          logs = await downloadWorkflowLogs(run.id, workflowInfo.name, run.run_number);
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
            steps: job.steps.map((step) => ({
              name: step.name,
              status: step.status,
              conclusion: step.conclusion,
              number: step.number,
            })),
          })),
        });
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
