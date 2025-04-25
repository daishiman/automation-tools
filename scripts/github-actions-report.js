#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// __dirnameの代替（ESMでは直接使えないため）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数のロード（ESM対応）
dotenv.config();

// 入出力ディレクトリの設定
const INPUT_DIR = process.env.INPUT_DIR || 'github-actions-results';
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'github-actions-reports';

// 引数の解析
const args = process.argv.slice(2);
const inputFile = args[0]; // 入力JSONファイル名

/**
 * 実行結果のステータスに応じた色を返す
 */
function getStatusColor(status, conclusion) {
  if (status !== 'completed') return '#9e9e9e'; // グレー（進行中）

  switch (conclusion) {
    case 'success':
      return '#4caf50'; // 緑（成功）
    case 'failure':
      return '#f44336'; // 赤（失敗）
    case 'cancelled':
      return '#ff9800'; // オレンジ（キャンセル）
    case 'skipped':
      return '#2196f3'; // 青（スキップ）
    default:
      return '#9e9e9e'; // グレー（その他）
  }
}

/**
 * ジョブの詳細情報をHTMLで生成
 */
function generateJobsHTML(jobs, logs) {
  if (!jobs || jobs.length === 0) {
    return '<p>ジョブ情報がありません</p>';
  }

  let html = '<div class="jobs">';

  jobs.forEach((job) => {
    const statusColor = getStatusColor(job.status, job.conclusion);
    const jobLog = logs && logs[job.name] ? logs[job.name] : null;

    html += `
      <div class="job-card">
        <div class="job-header" style="border-left: 4px solid ${statusColor}">
          <h3>${job.name}</h3>
          <div class="job-status" style="background-color: ${statusColor}">${
            job.conclusion || job.status
          }</div>
        </div>
        <div class="job-details">
          <div><strong>開始:</strong> ${
            job.started_at ? new Date(job.started_at).toLocaleString() : '未開始'
          }</div>
          <div><strong>終了:</strong> ${
            job.completed_at ? new Date(job.completed_at).toLocaleString() : '未完了'
          }</div>
        </div>
        <div class="job-steps">
          <h4>ステップ:</h4>
          <ul class="steps-list">
            ${generateStepsHTML(job.steps)}
          </ul>
        </div>
        ${
          job.conclusion === 'failure'
            ? `
        <div class="log-section">
          <details ${job.conclusion === 'failure' ? 'open' : ''}>
            <summary>ログを表示</summary>
            <div class="log-content">
              <pre>${jobLog ? formatLog(jobLog) : 'ログが利用できません'}</pre>
            </div>
          </details>
        </div>`
            : ''
        }
      </div>
    `;
  });

  html += '</div>';
  return html;
}

/**
 * ログの内容をフォーマット
 */
function formatLog(log) {
  if (!log) return 'ログがありません';

  // HTMLエスケープ
  let escapedLog = log
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // エラーメッセージを強調
  escapedLog = escapedLog.replace(
    /(error|Error|ERROR|失敗|エラー)/g,
    '<span class="error-text">$1</span>'
  );

  // 行数を制限（最大3000行）
  const lines = escapedLog.split('\n');
  if (lines.length > 3000) {
    escapedLog =
      lines.slice(0, 1000).join('\n') +
      '\n...[省略されました]...\n' +
      lines.slice(lines.length - 2000).join('\n');
  }

  return escapedLog;
}

/**
 * ステップの詳細情報をHTMLで生成
 */
function generateStepsHTML(steps) {
  if (!steps || steps.length === 0) {
    return '<li>ステップ情報がありません</li>';
  }

  let html = '';

  steps.forEach((step) => {
    const statusColor = getStatusColor(step.status, step.conclusion);

    html += `
      <li class="step-item" style="border-left: 4px solid ${statusColor}">
        <div class="step-name">${step.number}. ${step.name}</div>
        <div class="step-status" style="background-color: ${statusColor}">${
          step.conclusion || step.status
        }</div>
      </li>
    `;
  });

  return html;
}

/**
 * HTMLレポートを生成
 */
function generateHTMLReport(data) {
  // ヘッダー部分（スタイルシートを含む）
  const header = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>GitHub Actions実行結果レポート</title>
      <style>
        :root {
          --primary-color: #0366d6;
          --secondary-color: #24292e;
          --background-color: #f6f8fa;
          --border-color: #e1e4e8;
          --text-color: #24292e;
          --success-color: #4caf50;
          --failure-color: #f44336;
          --warning-color: #ff9800;
          --info-color: #2196f3;
          --gray-color: #9e9e9e;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          color: var(--text-color);
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background-color: var(--background-color);
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        header {
          background-color: var(--primary-color);
          color: white;
          padding: 20px;
          margin-bottom: 20px;
          border-radius: 4px;
        }

        h1, h2, h3, h4 {
          margin-top: 0;
        }

        .workflow-card {
          background-color: white;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          margin-bottom: 20px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .workflow-header {
          padding: 15px;
          border-bottom: 1px solid var(--border-color);
          background-color: #fafbfc;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .workflow-content {
          padding: 20px;
        }

        .workflow-details {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 10px;
          margin-bottom: 20px;
        }

        .workflow-detail-item {
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background-color: #fafbfc;
        }

        .status-badge {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 15px;
          color: white;
          font-weight: bold;
          font-size: 0.8em;
        }

        .jobs {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 15px;
        }

        .job-card {
          background-color: white;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .job-header {
          padding: 12px 15px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #fafbfc;
        }

        .job-header h3 {
          margin: 0;
          font-size: 1em;
        }

        .job-status {
          padding: 3px 8px;
          border-radius: 12px;
          color: white;
          font-size: 0.8em;
          font-weight: bold;
        }

        .job-details {
          padding: 10px 15px;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.9em;
        }

        .job-steps {
          padding: 10px 15px;
          border-bottom: 1px solid var(--border-color);
        }

        .job-steps h4 {
          margin: 0 0 10px 0;
          font-size: 0.9em;
        }

        .steps-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .step-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          margin-bottom: 5px;
          background-color: #fafbfc;
          border-radius: 3px;
          font-size: 0.85em;
        }

        .step-status {
          padding: 2px 6px;
          border-radius: 10px;
          color: white;
          font-size: 0.8em;
        }

        .summary {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
        }

        .summary-item {
          flex: 1;
          min-width: 150px;
          padding: 15px;
          background-color: white;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .summary-number {
          font-size: 2em;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .log-section {
          padding: 10px 15px;
          border-top: 1px solid var(--border-color);
        }

        .log-section summary {
          cursor: pointer;
          font-weight: bold;
          padding: 8px 0;
        }

        .log-content {
          max-height: 300px;
          overflow-y: auto;
          background-color: #282c34;
          color: #abb2bf;
          padding: 10px;
          border-radius: 4px;
          font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
          font-size: 12px;
        }

        .log-content pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .error-text {
          color: #e06c75;
          font-weight: bold;
        }

        .log-toggle-all {
          text-align: right;
          margin-bottom: 10px;
        }

        .log-toggle-button {
          background-color: var(--primary-color);
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8em;
        }

        footer {
          text-align: center;
          padding: 20px;
          margin-top: 20px;
          color: #586069;
          font-size: 0.8em;
        }

        @media (max-width: 768px) {
          .workflow-details {
            grid-template-columns: 1fr;
          }

          .jobs {
            grid-template-columns: 1fr;
          }
        }
      </style>
      <script>
        function toggleAllLogs(show) {
          const details = document.querySelectorAll('.log-section details');
          details.forEach(detail => {
            detail.open = show;
          });
        }
      </script>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>GitHub Actions実行結果レポート</h1>
          <p>生成日時: ${new Date().toLocaleString()}</p>
        </header>
  `;

  // サマリー部分
  let successCount = 0;
  let failureCount = 0;
  let cancelledCount = 0;
  let inProgressCount = 0;

  data.forEach((run) => {
    if (run.status === 'completed') {
      if (run.conclusion === 'success') successCount++;
      else if (run.conclusion === 'failure') failureCount++;
      else if (run.conclusion === 'cancelled') cancelledCount++;
    } else {
      inProgressCount++;
    }
  });

  const summary = `
    <div class="summary">
      <div class="summary-item" style="border-top: 4px solid var(--success-color)">
        <div class="summary-number">${successCount}</div>
        <div>成功</div>
      </div>
      <div class="summary-item" style="border-top: 4px solid var(--failure-color)">
        <div class="summary-number">${failureCount}</div>
        <div>失敗</div>
      </div>
      <div class="summary-item" style="border-top: 4px solid var(--warning-color)">
        <div class="summary-number">${cancelledCount}</div>
        <div>キャンセル</div>
      </div>
      <div class="summary-item" style="border-top: 4px solid var(--info-color)">
        <div class="summary-number">${inProgressCount}</div>
        <div>進行中</div>
      </div>
      <div class="summary-item" style="border-top: 4px solid var(--gray-color)">
        <div class="summary-number">${data.length}</div>
        <div>合計</div>
      </div>
    </div>
  `;

  // ログ表示制御ボタン
  const logControls = `
    <div class="log-toggle-all">
      <button class="log-toggle-button" onclick="toggleAllLogs(true)">すべてのログを開く</button>
      <button class="log-toggle-button" onclick="toggleAllLogs(false)">すべてのログを閉じる</button>
    </div>
  `;

  // ワークフロー実行の詳細部分
  let workflowsContent = '';

  data.forEach((run) => {
    const statusColor = getStatusColor(run.status, run.conclusion);
    const hasFailedJobs = run.jobs.some((job) => job.conclusion === 'failure');

    workflowsContent += `
      <div class="workflow-card">
        <div class="workflow-header">
          <h2>${run.workflow_name} #${run.run_number}</h2>
          <div class="status-badge" style="background-color: ${statusColor}">
            ${run.conclusion || run.status}
          </div>
        </div>
        <div class="workflow-content">
          <div class="workflow-details">
            <div class="workflow-detail-item">
              <strong>実行ID:</strong> ${run.run_id}
            </div>
            <div class="workflow-detail-item">
              <strong>イベント:</strong> ${run.event}
            </div>
            <div class="workflow-detail-item">
              <strong>作成日時:</strong> ${new Date(run.created_at).toLocaleString()}
            </div>
            <div class="workflow-detail-item">
              <strong>更新日時:</strong> ${new Date(run.updated_at).toLocaleString()}
            </div>
          </div>
          <h3>ジョブ</h3>
          ${
            hasFailedJobs
              ? '<div class="error-banner">このワークフローには失敗したジョブがあります</div>'
              : ''
          }
          ${generateJobsHTML(run.jobs, run.logs)}
        </div>
      </div>
    `;
  });

  // フッター部分
  const footer = `
        <footer>
          <p>Automationa Tools によって生成されたレポート</p>
        </footer>
      </div>
    </body>
    </html>
  `;

  return header + summary + logControls + workflowsContent + footer;
}

/**
 * メイン関数
 */
async function main() {
  console.log('GitHub Actions実行結果レポートの生成を開始します...');

  if (!inputFile) {
    console.error('エラー: 入力ファイルが指定されていません。');
    console.error('使用法: node github-actions-report.js <input-file.json>');
    process.exit(1);
  }

  const inputPath = path.join(INPUT_DIR, inputFile);

  // 入力ファイルの存在確認
  if (!fs.existsSync(inputPath)) {
    console.error(`エラー: 入力ファイル '${inputPath}' が見つかりません。`);
    process.exit(1);
  }

  // JSONファイルの読み込み
  let data;
  try {
    const fileContent = fs.readFileSync(inputPath, 'utf8');
    data = JSON.parse(fileContent);
  } catch (error) {
    console.error(`JSONファイルの読み込みエラー: ${error.message}`);
    process.exit(1);
  }

  // 出力ディレクトリの作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // HTMLレポートの生成と保存
  const outputFilename = inputFile.replace('.json', '.html');
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  const htmlReport = generateHTMLReport(data);
  fs.writeFileSync(outputPath, htmlReport);

  console.log(`HTMLレポートを保存しました: ${outputPath}`);
}

// スクリプトの実行
main().catch((error) => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
});
