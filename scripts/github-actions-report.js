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

// リポジトリ情報の設定
const OWNER = process.env.GITHUB_OWNER || 'daishiman';
const REPO = process.env.GITHUB_REPO || 'automation-tools';

// 引数の解析
const args = process.argv.slice(2);
const inputFile = args[0]; // 入力JSONファイル名

// ワークフローの種類によって色を変えるマッピング
const workflowColorMap = {
  'コード品質チェック（リント）': '#673AB7', // 紫
  'コードフォーマットチェック': '#2196F3', // 青
  '単体テスト実行': '#4CAF50', // 緑
  '統合テスト実行': '#FF9800', // オレンジ
  '開発環境 CI/CD': '#03A9F4', // 水色
  '本番環境 CI/CD': '#F44336', // 赤
  '再利用可能セットアップ': '#9E9E9E', // グレー
  'データベースマイグレーション': '#795548', // 茶色
  'デプロイ後検証': '#009688', // ティール
  '本番環境へのプロモート': '#E91E63', // ピンク
};

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
 * ワークフロー名に応じた色を返す
 */
function getWorkflowColor(workflowName) {
  // マップに登録されている色があればそれを使用
  return workflowColorMap[workflowName] || '#424242'; // デフォルト色はダークグレー
}

/**
 * ジョブの詳細情報をHTMLで生成
 */
function generateJobsHTML(jobs) {
  if (!jobs || jobs.length === 0) {
    return '<p>ジョブ情報がありません</p>';
  }

  let html = '<div class="jobs">';

  jobs.forEach((job) => {
    const statusColor = getStatusColor(job.status, job.conclusion);

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
        ${job.steps && job.steps.length > 0 ?
        `<div class="job-steps">
          <h4>ステップ:</h4>
          <ul class="steps-list">
            ${generateStepsHTML(job.steps)}
          </ul>
        </div>` : '<div class="job-steps"><p>ステップ情報なし</p></div>'}
      </div>
    `;
  });

  html += '</div>';
  return html;
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

        .error-banner {
          background-color: #ffebee;
          color: #b71c1c;
          padding: 10px;
          margin-bottom: 15px;
          border-radius: 4px;
          border-left: 4px solid #f44336;
        }

        .filters {
          margin-bottom: 20px;
          padding: 15px;
          background-color: white;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .filter-options {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
        }

        .filter-button {
          padding: 5px 10px;
          border: 1px solid var(--border-color);
          border-radius: 15px;
          background-color: #f1f1f1;
          cursor: pointer;
          font-size: 0.9em;
        }

        .filter-button:hover {
          background-color: #e3e3e3;
        }

        .filter-button.active {
          background-color: var(--primary-color);
          color: white;
        }

        .timestamp {
          font-size: 0.9em;
          color: #666;
        }

        .workflow-link {
          text-decoration: none;
          color: var(--primary-color);
          font-size: 0.85em;
          margin-left: 10px;
        }

        .chart-container {
          margin-bottom: 20px;
          text-align: center;
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
        // ページ読み込み完了時に実行
        document.addEventListener('DOMContentLoaded', function() {
          // 初期状態ですべてのワークフローを表示
          filterWorkflows('all');
        });

        function filterWorkflows(status) {
          console.log('Filtering by status:', status);

          // すべてのフィルターボタンから'active'クラスを削除
          document.querySelectorAll('.filter-button').forEach(btn => {
            btn.classList.remove('active');
          });

          // クリックされたボタンに'active'クラスを追加
          const activeButton = document.getElementById('filter-' + status);
          if (activeButton) {
            activeButton.classList.add('active');
          }

          // すべてのワークフローカードを取得
          const workflowCards = document.querySelectorAll('.workflow-card');

          workflowCards.forEach(card => {
            const cardStatus = card.getAttribute('data-status');
            console.log('Card status:', cardStatus, 'Filtering by:', status);

            if (status === 'all' || cardStatus === status) {
              card.style.display = 'block';
            } else {
              card.style.display = 'none';
            }
          });
        }
      </script>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>GitHub Actions実行結果レポート</h1>
          <p>生成日時: ${new Date().toLocaleString()}</p>
          <p>リポジトリ: ${OWNER}/${REPO}</p>
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

  // シンプルな円グラフ - SVGで描画
  let chartHTML = '';

  if (data.length > 0) {
    const total = successCount + failureCount + cancelledCount + inProgressCount;
    const successPercent = successCount / total;
    const failurePercent = failureCount / total;
    const cancelledPercent = cancelledCount / total;
    const inProgressPercent = inProgressCount / total;

    // SVGの円周の長さは 2πr = 2 * π * 45 ≈ 283
    const circumference = 2 * Math.PI * 45;

    chartHTML = `
      <div class="chart-container">
        <h3>実行結果の分布</h3>
        <svg width="250" height="250" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="transparent" stroke="#eee" stroke-width="10" />

          <!-- 成功部分 -->
          ${successCount > 0 ? `
          <circle cx="50" cy="50" r="45" fill="transparent" stroke="#4caf50" stroke-width="10"
            stroke-dasharray="${successPercent * circumference} ${circumference}"
            transform="rotate(-90 50 50)" />
          ` : ''}

          <!-- 失敗部分 -->
          ${failureCount > 0 ? `
          <circle cx="50" cy="50" r="45" fill="transparent" stroke="#f44336" stroke-width="10"
            stroke-dasharray="${failurePercent * circumference} ${circumference}"
            stroke-dashoffset="${-1 * (successPercent * circumference)}"
            transform="rotate(-90 50 50)" />
          ` : ''}

          <!-- キャンセル部分 -->
          ${cancelledCount > 0 ? `
          <circle cx="50" cy="50" r="45" fill="transparent" stroke="#ff9800" stroke-width="10"
            stroke-dasharray="${cancelledPercent * circumference} ${circumference}"
            stroke-dashoffset="${-1 * ((successPercent + failurePercent) * circumference)}"
            transform="rotate(-90 50 50)" />
          ` : ''}

          <!-- 進行中部分 -->
          ${inProgressCount > 0 ? `
          <circle cx="50" cy="50" r="45" fill="transparent" stroke="#2196f3" stroke-width="10"
            stroke-dasharray="${inProgressPercent * circumference} ${circumference}"
            stroke-dashoffset="${-1 * ((successPercent + failurePercent + cancelledPercent) * circumference)}"
            transform="rotate(-90 50 50)" />
          ` : ''}
        </svg>
        <div style="margin-top: 15px; display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
          ${successCount > 0 ? `<div><span style="display: inline-block; width: 12px; height: 12px; background-color: #4caf50; margin-right: 5px;"></span> 成功 (${successCount})</div>` : ''}
          ${failureCount > 0 ? `<div><span style="display: inline-block; width: 12px; height: 12px; background-color: #f44336; margin-right: 5px;"></span> 失敗 (${failureCount})</div>` : ''}
          ${cancelledCount > 0 ? `<div><span style="display: inline-block; width: 12px; height: 12px; background-color: #ff9800; margin-right: 5px;"></span> キャンセル (${cancelledCount})</div>` : ''}
          ${inProgressCount > 0 ? `<div><span style="display: inline-block; width: 12px; height: 12px; background-color: #2196f3; margin-right: 5px;"></span> 進行中 (${inProgressCount})</div>` : ''}
        </div>
      </div>
    `;
  }

  // フィルターボタン
  const filters = `
    <div class="filters">
      <h3>フィルター</h3>
      <div class="filter-options">
        <button id="filter-all" class="filter-button active" onclick="filterWorkflows('all')">すべて</button>
        <button id="filter-success" class="filter-button" onclick="filterWorkflows('success')">成功</button>
        <button id="filter-failure" class="filter-button" onclick="filterWorkflows('failure')">失敗</button>
        <button id="filter-cancelled" class="filter-button" onclick="filterWorkflows('cancelled')">キャンセル</button>
        <button id="filter-in_progress" class="filter-button" onclick="filterWorkflows('in_progress')">進行中</button>
      </div>
    </div>
  `;

  // ワークフロー実行の詳細部分
  let workflowsContent = '';

  data.forEach((run) => {
    const statusColor = getStatusColor(run.status, run.conclusion);
    const workflowColor = getWorkflowColor(run.workflow_name);
    const hasFailedJobs = run.jobs.some((job) => job.conclusion === 'failure');

    // フィルタリング用のステータス属性を厳密に設定
    let dataStatus = 'unknown';
    if (run.status === 'completed') {
      dataStatus = run.conclusion || 'unknown';
    } else if (run.status === 'in_progress') {
      dataStatus = 'in_progress';
    } else {
      dataStatus = run.status || 'unknown';
    }

    workflowsContent += `
      <div class="workflow-card" data-status="${dataStatus}">
        <div class="workflow-header" style="border-left: 4px solid ${workflowColor}">
          <h2>${run.workflow_name} #${run.run_number}</h2>
          <div class="status-badge" style="background-color: ${statusColor}">
            ${run.conclusion || run.status}
          </div>
        </div>
        <div class="workflow-content">
          <div class="workflow-details">
            <div class="workflow-detail-item">
              <strong>実行ID:</strong> ${run.run_id}
              <a href="https://github.com/${OWNER}/${REPO}/actions/runs/${run.run_id}" target="_blank" class="workflow-link">GitHubで表示</a>
            </div>
            <div class="workflow-detail-item">
              <strong>イベント:</strong> ${run.event}
            </div>
            <div class="workflow-detail-item">
              <strong>作成日時:</strong>
              <span class="timestamp">${new Date(run.created_at).toLocaleString()}</span>
            </div>
            <div class="workflow-detail-item">
              <strong>更新日時:</strong>
              <span class="timestamp">${new Date(run.updated_at).toLocaleString()}</span>
            </div>
          </div>
          <h3>ジョブ</h3>
          ${
            hasFailedJobs
              ? '<div class="error-banner">このワークフローには失敗したジョブがあります</div>'
              : ''
          }
          ${generateJobsHTML(run.jobs)}
        </div>
      </div>
    `;
  });

  // データがない場合の表示
  if (data.length === 0) {
    workflowsContent = `
      <div class="workflow-card">
        <div class="workflow-header">
          <h2>実行結果がありません</h2>
        </div>
        <div class="workflow-content">
          <p>GitHub Actionsの実行結果が見つかりませんでした。最近のワークフロー実行がない可能性があります。</p>
        </div>
      </div>
    `;
  }

  // フッター部分
  const footer = `
        <footer>
          <p>Automationa Tools によって生成されたレポート</p>
        </footer>
      </div>
    </body>
    </html>
  `;

  return header + summary + chartHTML + filters + workflowsContent + footer;
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
