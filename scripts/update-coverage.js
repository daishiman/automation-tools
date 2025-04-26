const fs = require('fs');
const path = require('path');

// ファイルパスの設定
const coverageHistoryPath = path.join(__dirname, '../docs/coverage-history.json');
const coverageSummaryPath = path.join(__dirname, '../docs/coverage-summary.md');
const coverageJsonPath = path.join(__dirname, '../coverage/coverage-summary.json');

// 現在の日時を取得
const now = new Date();
const dateString = now.toISOString().split('T')[0];

// カバレッジ履歴を読み込む
let coverageHistory;
try {
  const historyData = fs.readFileSync(coverageHistoryPath, 'utf8');
  coverageHistory = JSON.parse(historyData);
} catch (error) {
  console.error('カバレッジ履歴ファイルの読み込みに失敗しました:', error);
  coverageHistory = { history: [] };
}

// カバレッジサマリーJSONを読み込む
try {
  if (fs.existsSync(coverageJsonPath)) {
    const coverageData = fs.readFileSync(coverageJsonPath, 'utf8');
    const coverageSummary = JSON.parse(coverageData);

    // 全体のカバレッジ情報を抽出
    const total = coverageSummary.total || {};
    const lines = total.lines || { pct: 0 };
    const statements = total.statements || { pct: 0 };
    const functions = total.functions || { pct: 0 };
    const branches = total.branches || { pct: 0 };

    // 履歴に追加
    coverageHistory.history.push({
      date: dateString,
      lines: lines.pct,
      statements: statements.pct,
      functions: functions.pct,
      branches: branches.pct,
    });

    // 最新の10件だけを保持
    if (coverageHistory.history.length > 10) {
      coverageHistory.history = coverageHistory.history.slice(-10);
    }

    // 履歴ファイルを更新
    fs.writeFileSync(coverageHistoryPath, JSON.stringify(coverageHistory, null, 2), 'utf8');
    console.log('カバレッジ履歴を更新しました');

    // マークダウンファイルを更新
    const markdownContent = generateMarkdownSummary(coverageHistory, total);
    fs.writeFileSync(coverageSummaryPath, markdownContent, 'utf8');
    console.log('カバレッジサマリーマークダウンを更新しました');
  } else {
    console.error('カバレッジJSONファイルが見つかりません');
  }
} catch (error) {
  console.error('カバレッジ情報の更新に失敗しました:', error);
}

// マークダウンサマリーを生成する関数
function generateMarkdownSummary(historyData, totalCoverage) {
  const history = historyData.history;
  const latest = history.length > 0 ? history[history.length - 1] : null;

  let markdown = `# テストカバレッジサマリー\n\n`;
  markdown += `このドキュメントには最新のテストカバレッジ結果が自動的に更新されます。\n\n`;
  markdown += `## 最新カバレッジ情報\n\n`;

  if (latest) {
    markdown += `**更新日**: ${latest.date}\n\n`;
    markdown += `| メトリック | カバレッジ |\n`;
    markdown += `| -------- | -------: |\n`;
    markdown += `| ライン | ${latest.lines}% |\n`;
    markdown += `| ステートメント | ${latest.statements}% |\n`;
    markdown += `| 関数 | ${latest.functions}% |\n`;
    markdown += `| ブランチ | ${latest.branches}% |\n\n`;
  } else {
    markdown += `現在のカバレッジデータはまだ生成されていません。\n\n`;
  }

  markdown += `## 履歴\n\n`;

  if (history.length > 0) {
    markdown += `| 日付 | ライン | ステートメント | 関数 | ブランチ |\n`;
    markdown += `| ---- | ----: | ---------: | ---: | -----: |\n`;

    // 履歴を逆順（新しい順）に表示
    [...history].reverse().forEach((entry) => {
      markdown += `| ${entry.date} | ${entry.lines}% | ${entry.statements}% | ${entry.functions}% | ${entry.branches}% |\n`;
    });
  } else {
    markdown += `履歴データはまだありません。\n`;
  }

  return markdown;
}
