# GitHub Actions実行結果取得ツール

このツールは、GitHub Actionsの実行結果をAPI経由で取得し、JSONファイルとHTMLレポートとして保存するためのユーティリティです。

## 目的

- GitHub Actionsのワークフロー実行結果を取得・保存
- 実行結果をわかりやすいHTMLレポートとして表示
- ワークフロー実行のログをダウンロード（オプション）

## 前提条件

1. GitHub Personal Access Token (PAT)が必要です

   - リポジトリのActionsにアクセスできる権限が必要
   - 最低限 `repo`, `workflow` スコープが必要

2. 環境変数の設定
   - `.env`ファイルを作成し、以下の変数を設定してください
   ```
   GITHUB_TOKEN=your_personal_access_token
   GITHUB_REPOSITORY_OWNER=your_username_or_org
   GITHUB_REPOSITORY_NAME=your_repository
   DOWNLOAD_LOGS=false  # ログをダウンロードする場合はtrueに設定
   ```

## 使用方法

### GitHub Actionsのワークフロー一覧と実行結果を取得

```bash
# すべてのワークフローの実行結果を取得
pnpm gh:actions:fetch:all

# 特定のワークフローの実行結果を取得（ワークフローIDを指定）
pnpm gh:actions:fetch workflow_id [limit]
```

例：

```bash
# ワークフローID 12345678 の実行結果を最大5件取得
pnpm gh:actions:fetch 12345678 5
```

### HTMLレポートの生成

```bash
# JSONファイルからHTMLレポートを生成
pnpm gh:actions:report input_file.json
```

例：

```bash
# all-workflow-results.jsonからレポートを生成
pnpm gh:actions:report all-workflow-results.json

# 特定のワークフローのレポートを生成
pnpm gh:actions:report workflow-12345678-results.json
```

### 全ワークフローの取得からレポート作成までを一括実行

```bash
pnpm gh:actions:full
```

## 出力ファイル

- ワークフロー一覧: `github-actions-results/workflows.json`
- 実行結果JSON:
  - すべてのワークフロー: `github-actions-results/all-workflow-results.json`
  - 特定のワークフロー: `github-actions-results/workflow-{id}-results.json`
- HTMLレポート: `github-actions-reports/{input_filename}.html`
- ログファイル: `github-actions-results/workflow-run-{run_id}.zip`（DOWNLOAD_LOGS=trueの場合）

## カスタマイズ

以下の環境変数を設定することで、出力先などをカスタマイズできます：

- `INPUT_DIR`: 入力JSONファイルのディレクトリ（デフォルト: `github-actions-results`）
- `OUTPUT_DIR`: HTMLレポートの出力先ディレクトリ（デフォルト: `github-actions-reports`）

## 開発者向け情報

### 主要ファイル

- `scripts/github-actions-results.js`: GitHub APIを使用して実行結果を取得するスクリプト
- `scripts/github-actions-report.js`: 取得した結果からHTMLレポートを生成するスクリプト

### 実装の詳細

1. GitHub APIクライアント（Octokit）を使用して、ワークフロー情報を取得
2. ワークフロー実行、ジョブ、ステップの詳細情報を順次取得
3. 実行結果をJSON形式で保存
4. JSONデータを解析してHTMLレポートを生成
5. 必要に応じてログファイルもダウンロード

## エラーとトラブルシューティング

- **認証エラー**: GitHub Tokenが正しく設定されているか確認
- **リポジトリが見つからない**: リポジトリ名とオーナー名が正しいか確認
- **APIレート制限**: GitHubのAPI制限に達した場合は時間をおいて再試行

## 注意事項

- API制限: GitHubのAPI使用制限に注意してください
- ログファイルサイズ: ログが大きい場合はディスク容量に注意してください
- セキュリティ: GitHub Tokenは安全に管理し、公開リポジトリにコミットしないでください
