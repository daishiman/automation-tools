#!/usr/bin/env node
/**
 * テストカバレッジを記録し、履歴を管理するスクリプト
 * CIで実行するか、ローカルで手動実行して、カバレッジの推移を追跡します
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 色の定義
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const NC = '\x1b[0m'; // No Color

// カバレッジ履歴ファイルのパス
const COVERAGE_HISTORY_FILE = path.join(process.cwd(), 'docs', 'coverage-history.json');
const COVERAGE_SUMMARY_FILE = path.join(process.cwd(), 'docs', 'coverage-summary.md');
const COVERAGE_FINAL_JSON = path.join(process.cwd(), 'coverage', 'coverage-final.json');

/**
 * コマンドを実行する
 * @param {string} command - 実行するコマンド
 * @param {boolean} silent - 出力を表示しない場合はtrue
 * @returns {string} - コマンドの出力
 */
function runCommand(command, silent = false) {
  try {
    const output = execSync(command, {
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf-8'
    });
    return output;
  } catch (error) {
    if (!silent) {
      console.error(`${RED}コマンド実行エラー: ${error.message}${NC}`);
    }
    throw error;
  }
}

/**
 * docsディレクトリが存在することを確認
 */
function ensureDocsDirectory() {
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
}

/**
 * カバレッジファイルから情報を取得する
 * @returns {Object} カバレッジ情報
 */
function extractCoverageInfo() {
  try {
    // カバレッジが存在しない場合はテスト実行
    if (!fs.existsSync(COVERAGE_FINAL_JSON)) {
      console.log(`${YELLOW}カバレッジファイルが見つかりません。テストを実行します...${NC}`);
      runCommand('pnpm test:coverage');
    }

    if (!fs.existsSync(COVERAGE_FINAL_JSON)) {
      throw new Error('カバレッジファイルが生成されませんでした');
    }

    // カバレッジファイルを読み込み
    const coverageData = JSON.parse(fs.readFileSync(COVERAGE_FINAL_JSON, 'utf8'));

    // 全体の統計を計算
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalLines = 0;
    let coveredLines = 0;

    // 各ファイルの情報を集計
    Object.keys(coverageData).forEach(filePath => {
      const fileData = coverageData[filePath];

      // ステートメント
      if (fileData.statementMap && fileData.s) {
        totalStatements += Object.keys(fileData.statementMap).length;
        coveredStatements += Object.values(fileData.s).filter(v => v > 0).length;
      }

      // 関数
      if (fileData.fnMap && fileData.f) {
        totalFunctions += Object.keys(fileData.fnMap).length;
        coveredFunctions += Object.values(fileData.f).filter(v => v > 0).length;
      }

      // ブランチ
      if (fileData.branchMap && fileData.b) {
        Object.values(fileData.b).forEach(branches => {
          totalBranches += branches.length;
          coveredBranches += branches.filter(v => v > 0).length;
        });
      }

      // 行
      if (fileData.s) {
        // 行数を推定（正確ではないが概算）
        const lineKeys = new Set();
        Object.keys(fileData.statementMap).forEach(key => {
          const stmt = fileData.statementMap[key];
          for (let i = stmt.start.line; i <= stmt.end.line; i++) {
            lineKeys.add(i);
          }
        });
        totalLines += lineKeys.size;

        // カバーされた行を推定
        const coveredLineKeys = new Set();
        Object.keys(fileData.s).forEach(key => {
          if (fileData.s[key] > 0) {
            const stmt = fileData.statementMap[key];
            for (let i = stmt.start.line; i <= stmt.end.line; i++) {
              coveredLineKeys.add(i);
            }
          }
        });
        coveredLines += coveredLineKeys.size;
      }
    });

    // パーセンテージを計算
    const statementCoverage = totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0;
    const functionCoverage = totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0;
    const branchCoverage = totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0;
    const lineCoverage = totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;
    const totalCoverage = (statementCoverage + functionCoverage + branchCoverage + lineCoverage) / 4;

    return {
      date: new Date().toISOString(),
      statements: {
        total: totalStatements,
        covered: coveredStatements,
        percentage: statementCoverage.toFixed(2)
      },
      functions: {
        total: totalFunctions,
        covered: coveredFunctions,
        percentage: functionCoverage.toFixed(2)
      },
      branches: {
        total: totalBranches,
        covered: coveredBranches,
        percentage: branchCoverage.toFixed(2)
      },
      lines: {
        total: totalLines,
        covered: coveredLines,
        percentage: lineCoverage.toFixed(2)
      },
      total: {
        percentage: totalCoverage.toFixed(2)
      }
    };
  } catch (error) {
    console.error(`${RED}カバレッジ情報の抽出に失敗しました: ${error.message}${NC}`);
    throw error;
  }
}

/**
 * カバレッジ履歴ファイルを更新する
 * @param {Object} coverageInfo - カバレッジ情報
 */
function updateCoverageHistory(coverageInfo) {
  try {
    ensureDocsDirectory();

    let history = [];

    // 既存の履歴を読み込む
    if (fs.existsSync(COVERAGE_HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(COVERAGE_HISTORY_FILE, 'utf8'));
    }

    // 今日のエントリがあるか確認
    const today = new Date().toISOString().split('T')[0];
    const existingTodayEntry = history.findIndex(entry =>
      entry.date.split('T')[0] === today
    );

    if (existingTodayEntry !== -1) {
      // 今日のエントリを更新
      history[existingTodayEntry] = coverageInfo;
    } else {
      // 新しいエントリを追加
      history.push(coverageInfo);
    }

    // 最大100エントリまで保持
    if (history.length > 100) {
      history = history.slice(-100);
    }

    // 日付でソート
    history.sort((a, b) => new Date(a.date) - new Date(b.date));

    // ファイルに書き込む
    fs.writeFileSync(COVERAGE_HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log(`${GREEN}カバレッジ履歴を更新しました: ${COVERAGE_HISTORY_FILE}${NC}`);

    return history;
  } catch (error) {
    console.error(`${RED}カバレッジ履歴の更新に失敗しました: ${error.message}${NC}`);
    throw error;
  }
}

/**
 * カバレッジサマリーファイルを生成する
 * @param {Array} history - カバレッジ履歴
 * @param {Object} latestCoverage - 最新のカバレッジ情報
 */
function generateCoverageSummary(history, latestCoverage) {
  try {
    ensureDocsDirectory();

    // 最新の5エントリを取得
    const recentHistory = history.slice(-5);

    // Markdown形式でファイルを生成
    let markdown = `# テストカバレッジサマリー\n\n`;
    markdown += `最終更新: ${new Date().toLocaleString('ja-JP')}\n\n`;

    // 現在のカバレッジ
    markdown += `## 現在のカバレッジ\n\n`;
    markdown += `- **総合カバレッジ**: ${latestCoverage.total.percentage}%\n`;
    markdown += `- **ステートメントカバレッジ**: ${latestCoverage.statements.percentage}% (${latestCoverage.statements.covered}/${latestCoverage.statements.total})\n`;
    markdown += `- **関数カバレッジ**: ${latestCoverage.functions.percentage}% (${latestCoverage.functions.covered}/${latestCoverage.functions.total})\n`;
    markdown += `- **分岐カバレッジ**: ${latestCoverage.branches.percentage}% (${latestCoverage.branches.covered}/${latestCoverage.branches.total})\n`;
    markdown += `- **行カバレッジ**: ${latestCoverage.lines.percentage}% (${latestCoverage.lines.covered}/${latestCoverage.lines.total})\n\n`;

    // カバレッジトレンド
    markdown += `## カバレッジトレンド\n\n`;
    markdown += `| 日付 | 総合 | ステートメント | 関数 | 分岐 | 行 |\n`;
    markdown += `|------|------|----------------|------|------|------|\n`;

    recentHistory.forEach(entry => {
      const date = new Date(entry.date).toLocaleDateString('ja-JP');
      markdown += `| ${date} | ${entry.total.percentage}% | ${entry.statements.percentage}% | ${entry.functions.percentage}% | ${entry.branches.percentage}% | ${entry.lines.percentage}% |\n`;
    });

    markdown += `\n## 完全な履歴\n\n`;
    markdown += `詳細なカバレッジ履歴は [coverage-history.json](./coverage-history.json) をご覧ください。\n\n`;

    markdown += `## カバレッジレポートの生成方法\n\n`;
    markdown += `以下のコマンドでカバレッジレポートを生成できます：\n\n`;
    markdown += `\`\`\`bash\n`;
    markdown += `# 全体のカバレッジを取得\n`;
    markdown += `pnpm test:coverage\n\n`;
    markdown += `# ユニットテストのカバレッジのみを取得\n`;
    markdown += `pnpm test:unit:coverage\n\n`;
    markdown += `# 統合テストのカバレッジのみを取得\n`;
    markdown += `pnpm test:integration:coverage\n\n`;
    markdown += `# カバレッジ履歴を更新\n`;
    markdown += `pnpm coverage:report\n`;
    markdown += `\`\`\`\n\n`;

    markdown += `生成されたカバレッジレポートは \`coverage/index.html\` を開くことで閲覧できます。\n`;

    // ファイルに書き込む
    fs.writeFileSync(COVERAGE_SUMMARY_FILE, markdown);
    console.log(`${GREEN}カバレッジサマリーを生成しました: ${COVERAGE_SUMMARY_FILE}${NC}`);
  } catch (error) {
    console.error(`${RED}カバレッジサマリーの生成に失敗しました: ${error.message}${NC}`);
    throw error;
  }
}

/**
 * メイン処理
 */
function main() {
  console.log(`${BLUE}テストカバレッジレポートを生成しています...${NC}`);

  try {
    // カバレッジ情報を取得
    const coverageInfo = extractCoverageInfo();

    // カバレッジ履歴を更新
    const history = updateCoverageHistory(coverageInfo);

    // カバレッジサマリーを生成
    generateCoverageSummary(history, coverageInfo);

    console.log(`${GREEN}カバレッジレポートの処理が完了しました！${NC}`);

    // 現在のカバレッジの表示
    console.log(`${BLUE}現在のカバレッジ:${NC}`);
    console.log(`総合カバレッジ: ${coverageInfo.total.percentage}%`);
    console.log(`ステートメントカバレッジ: ${coverageInfo.statements.percentage}%`);
    console.log(`関数カバレッジ: ${coverageInfo.functions.percentage}%`);
    console.log(`分岐カバレッジ: ${coverageInfo.branches.percentage}%`);
    console.log(`行カバレッジ: ${coverageInfo.lines.percentage}%`);
  } catch (error) {
    console.error(`${RED}カバレッジレポートの生成に失敗しました${NC}`);
    process.exit(1);
  }
}

// スクリプトを実行
main();

---


# 実際のIDを使用したwrangler.toml設定例

これらの値を使って設定を更新します。ただし、APIトークンなどの機密情報はGitHubなどに公開しないよう注意してください。

```toml
# 本番環境専用のリソースID
[env.production.d1_databases]
DB = { binding = "DB", database_name = "automationa-tools-prod-db", database_id = "4d785c13-dd93-4147-8a2b-d40007e11914" }

[env.production.kv_namespaces]
SESSION_STORE = { binding = "SESSIONS", id = "3b54896922914910b93b6da0bb13763b" }
CACHE = { binding = "CACHE", id = "3b54896922914910b93b6da0bb13763b" } # 同じIDを使用

[env.production.r2_buckets]
ASSETS = { binding = "ASSETS", bucket_name = "automationa-tools-storage" }
BACKUPS = { binding = "BACKUPS", bucket_name = "automationa-tools-backup" } # まだダミー
```

## GitHubシークレットの設定

提供されたアカウントIDとAPIトークンはGitHub Actionsで使用できます：

1. リポジトリ設定 > Settings > Secrets and variables > Actions
2. 以下のシークレットを追加:
   - `CF_ACCOUNT_ID`: b3dde7be1cd856788fc47595ac455475
   - `CF_API_TOKEN`: O1kI6U0f4L1KeonL21vgVcgTiuQTFSeO_A4U6raB

## ローカル環境の設定

`.dev.vars`ファイルまたは環境変数として設定：

```bash
export CF_ACCOUNT_ID=b3dde7be1cd856788fc47595ac455475
export CF_API_TOKEN=O1kI6U0f4L1KeonL21vgVcgTiuQTFSeO_A4U6raB
```

## 残りのリソース作成コマンド

本番環境のR2バックアップバケットがまだ必要です：

```bash
pnpm exec wrangler r2 bucket create automationa-tools-backup --account-id=b3dde7be1cd856788fc47595ac455475
```

開発環境のリソースも同様に作成します：

```bash
# 開発環境DB
pnpm exec wrangler d1 create automationa-tools-dev-db --account-id=b3dde7be1cd856788fc47595ac455475

# 開発環境KV
pnpm exec wrangler kv:namespace create "SESSION_STORE_DEV" --account-id=b3dde7be1cd856788fc47595ac455475
pnpm exec wrangler kv:namespace create "CACHE_DEV" --account-id=b3dde7be1cd856788fc47595ac455475

# 開発環境R2
pnpm exec wrangler r2 bucket create dev-automationa-tools-storage --account-id=b3dde7be1cd856788fc47595ac455475
pnpm exec wrangler r2 bucket create dev-automationa-tools-backup --account-id=b3dde7be1cd856788fc47595ac455475
```

## 注意点

* APIトークンは機密情報なので、公開リポジトリにコミットしないでください
* 実際のプロジェクトではローテーションポリシーを設定し、定期的にトークンを更新することをお勧めします
* CIパイプラインでは必ず環境変数またはシークレットとして設定してください
