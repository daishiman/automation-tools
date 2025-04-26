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
   - GitHubの新しいトークン形式（fine-grained token）ではなく、従来のトークンを使用する必要があります

2. GitHub Personal Access Tokenの取得方法:

   - GitHubにログイン後、右上のプロフィールアイコン→Settings→Developer settings→Personal access tokens→Tokens (classic)を選択
   - 「Generate new token (classic)」をクリック
   - 少なくとも以下のスコープを選択:
     - `repo` (すべてにチェック)
     - `workflow`
   - トークンの有効期限を設定（推奨: 90日）
   - 「Generate token」をクリックしてトークンを生成
   - 生成されたトークンを安全な場所に保存（表示は一度きりです）

3. 環境変数の設定（以下のいずれかの方法で設定）

   - `.env`ファイルを作成する方法:

     ```
     # プロジェクトのルートディレクトリに.envファイルを作成
     GITHUB_TOKEN=your_personal_access_token
     GITHUB_REPOSITORY_OWNER=your_username_or_org
     GITHUB_REPOSITORY_NAME=your_repository
     DOWNLOAD_LOGS=false  # ログをダウンロードする場合はtrueに設定
     EXTRACT_LOGS=false   # ダウンロードしたログを解凍する場合はtrueに設定
     ```

   - コマンド実行時に直接指定する方法:

     ```bash
     GITHUB_TOKEN=your_token pnpm gh:actions:fetch:all
     ```

   - 環境変数をエクスポートする方法（ターミナルセッション中のみ有効）:
     ```bash
     export GITHUB_TOKEN=your_token
     export GITHUB_REPOSITORY_OWNER=your_username_or_org
     export GITHUB_REPOSITORY_NAME=your_repository
     ```

4. 環境変数の優先順位:
   - コマンドライン実行時に指定された環境変数（最優先）
   - `.env.local`ファイルの環境変数
   - `.env.development`ファイルの環境変数
   - `.env`ファイルの環境変数
   - システム環境変数

## 使用方法

### GitHub Actionsのワークフロー一覧と実行結果を取得

```bash
# すべてのワークフローの実行結果を取得
pnpm gh:actions:fetch:all

# 特定のワークフローの実行結果を取得（ワークフローIDを指定）
pnpm gh:actions:fetch workflow_id [limit]

# テストモード（GitHub APIを使用せずダミーデータを生成）
pnpm gh:actions:fetch:test
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

# テストデータのレポートを生成
pnpm gh:actions:report test-workflow-results.json
```

### 全ワークフローの取得からレポート作成までを一括実行

```bash
pnpm gh:actions:full

# ログもダウンロードする場合
pnpm gh:actions:full:with-logs

# GitHub Tokenなどの環境変数を直接指定して実行
GITHUB_TOKEN=your_token GITHUB_OWNER=your_owner GITHUB_REPO=your_repo pnpm gh:actions:full:env

# テストモードで実行（API呼び出しなし）
pnpm gh:actions:test:full
```

## 出力ファイル

- ワークフロー一覧: `github-actions-results/workflows.json`
- 実行結果JSON:
  - すべてのワークフロー: `github-actions-results/all-workflow-results.json`
  - 特定のワークフロー: `github-actions-results/workflow-{id}-results.json`
  - テストモード: `github-actions-results/test-workflow-results.json`
- HTMLレポート: `github-actions-reports/{input_filename}.html`
- ログファイル: `github-actions-results/workflow-run-{run_id}.zip`（DOWNLOAD_LOGS=trueの場合）
- ログ解凍結果: `github-actions-results/logs/run-{run_id}/`（EXTRACT_LOGS=trueの場合）

## カスタマイズ

以下の環境変数を設定することで、出力先などをカスタマイズできます：

- `INPUT_DIR`: 入力JSONファイルのディレクトリ（デフォルト: `github-actions-results`）
- `OUTPUT_DIR`: HTMLレポートの出力先ディレクトリ（デフォルト: `github-actions-reports`）
- `DOWNLOAD_LOGS`: ワークフローの実行ログをダウンロードするかどうか（true/false）
- `EXTRACT_LOGS`: ダウンロードしたログファイルを解凍するかどうか（true/false）

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

### 認証エラー

- **「GITHUB_TOKENが設定されていません」**: `.env`ファイルを作成して、`GITHUB_TOKEN`を設定してください。
- **「認証エラー: GitHub Tokenを確認してください」（401エラー）**: トークンが無効か、権限が不足している可能性があります。新しいトークンを生成してみてください。
- **「アクセス拒否」（403エラー）**: APIレート制限に達したか、リポジトリへのアクセス権限がない可能性があります。

### .envファイルの問題

- **「.envファイルが読み込まれていません」**: ファイルがプロジェクトのルートディレクトリに正しく配置されているか確認してください。
- **「環境変数が正しく設定されていません」**: 正しいフォーマットで環境変数が設定されているか確認してください。
- **各種.envファイルの違い**:
  - `.env`: 基本的な環境変数設定
  - `.env.local`: ローカル環境用（`.env`より優先）
  - `.env.development`: 開発環境用（`.env`より優先）

### リソースエラー

- **「Not Found」（404エラー）**: リポジトリ名、所有者名、またはワークフローIDが正しいか確認してください。
- **「リポジトリが見つからない」**: `GITHUB_REPOSITORY_OWNER`と`GITHUB_REPOSITORY_NAME`が正しく設定されているか確認してください。

### ログダウンロードエラー

- **「ワークフローのログ取得に失敗しました」**: アクセス権限の問題か、ログが既に期限切れになっている可能性があります。
- **「直接ダウンロードに失敗しました」**: ネットワーク接続の問題か、URLが無効になっている可能性があります。

### テストモードの使用

API接続の問題を切り分けるには、テストモードを使用して基本的な機能をテストできます：

```bash
node scripts/github-actions-results.js --test-mode
node scripts/github-actions-report.js test-workflow-results.json
```

または、便利なエイリアスを使用：

```bash
pnpm gh:actions:test:full
```

### APIレート制限の回避

GitHub APIには使用制限があります。大量のリクエストを行う場合は以下の対策を検討してください：

- 必要最小限のワークフローのみを取得する
- 取得する実行結果の数を制限する（limit引数を使用）
- 時間をおいて実行する
- 認証付きのAPIリクエストを使用する（API制限が緩和されます）

## 注意事項

- API制限: GitHubのAPI使用制限に注意してください
- ログファイルサイズ: ログが大きい場合はディスク容量に注意してください
- セキュリティ: GitHub Tokenは安全に管理し、公開リポジトリにコミットしないでください
- ログ保持期間: GitHub Actionsのログは90日間のみ保持されます
