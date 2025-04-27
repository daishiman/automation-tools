# GitHub Actions 自動化ガイド

このドキュメントでは、プロジェクトにおけるGitHub Actionsの自動化設定について詳細に解説します。CI/CD、データベース管理、バックアップ戦略など、すべての自動化プロセスの概要と設定方法を説明します。

## 🔰 初心者向け基本ガイド

**GitHub Actions**とは、コードリポジトリでの自動化ワークフローを実現するGitHubの機能です。コミット、プッシュ、PRなどの操作をトリガーとして、ビルド、テスト、デプロイなどのタスクを自動実行できます。

### 1. 基本的なファイル構造

GitHub Actionsの設定は、リポジトリの`.github/workflows/`ディレクトリにYAMLファイルとして保存します：

```
プロジェクトルート/
  ├── .github/
  │   └── workflows/
  │       ├── develop-ci.yml  # 開発環境用ワークフロー
  │       └── production-ci.yml  # 本番環境用ワークフロー
  ├── src/
  └── ...
```

### 2. 自動化の始め方 (クイックスタート)

1. リポジトリに`.github/workflows`ディレクトリを作成

   ```bash
   mkdir -p .github/workflows
   ```

2. ワークフローファイルを作成

   ```bash
   # 開発環境用ワークフローファイル
   touch .github/workflows/develop-ci.yml
   # 本番環境用ワークフローファイル
   touch .github/workflows/production-ci.yml
   ```

3. 環境変数とシークレットを設定

   ```bash
   # リポジトリのシークレット設定
   gh secret set CF_API_TOKEN --body "your-cloudflare-api-token"
   gh secret set CF_ACCOUNT_ID --body "your-cloudflare-account-id"

   # 環境変数設定（開発環境）
   gh variable set ENVIRONMENT --body "development" --env development
   gh variable set NEXT_PUBLIC_APP_URL --body "https://512dca79.automationa-tools.pages.dev" --env development

   # 環境変数設定（本番環境）
   gh variable set ENVIRONMENT --body "production" --env production
   gh variable set NEXT_PUBLIC_APP_URL --body "https://main.automationa-tools.pages.dev/" --env production
   ```

4. ワークフロー実行を確認

   ```bash
   # 実行履歴確認
   gh run list --workflow=develop-ci.yml

   # 特定の実行の詳細を表示
   gh run view <実行ID>
   ```

### 3. ワークフロー設定の基本構造

```yaml
name: ワークフロー名

# トリガー設定
on:
  push: # プッシュ時に実行
    branches: # 特定のブランチを指定
      - develop
  pull_request: # PR時に実行
  workflow_dispatch: # 手動実行

# 同時実行の制御
concurrency:
  group: workflow-${{ github.ref }}
  cancel-in-progress: true

# 実行するジョブの定義
jobs:
  job1:
    name: ジョブ名
    runs-on: ubuntu-latest # 実行環境
    steps: # 実行ステップ
      - name: ステップ1
        run: echo "Hello, World!"
```

## 🔄 変更履歴と改善点

**最終更新日**: 2024-05-28

以下の改善を行いました：

- 初心者向け基本ガイドを追加
- 全アクションのバージョンを最新に更新（checkout@v4, setup-node@v4, cache@v4など）
- CI/CDワークフローを開発・本番環境で明確に分離
- 環境変数とキャッシュ戦略の一貫性確保
- プロモーションワークフローの最適化
- Cloudflare Pagesデプロイコマンドの標準化
- バックアップワークフローの効率化
- デプロイURLの設定統一とスラッシュの一貫性確保
- ワークフローファイルの依存関係設定の改良
- テスト・ビルド・デプロイの各段階を明確に分離
- 初心者でも理解しやすいコメント追加
- 実際の環境変数・シークレット設定と整合性を確保
- 重複したCloudflareシークレットの説明を追加
- GitHub Actionsの最新APIと入力パラメータ構文に更新
- 実際のプロジェクト設定に合わせた環境変数設定例の提供

## 📋 目次

1. [CI/CDパイプライン](#1-cicdパイプライン)
2. [データベースマイグレーション自動化](#2-データベースマイグレーション自動化)
3. [バックアップ戦略](#3-バックアップ戦略)
4. [テスト自動化](#4-テスト自動化)
5. [環境変数・シークレット管理](#5-環境変数シークレット管理)
6. [自動化の最適化テクニック](#6-自動化の最適化テクニック)
7. [トラブルシューティング](#7-トラブルシューティング)
8. [運用保守](#8-運用保守)
9. [開発から本番へのプロモーション](#9-開発から本番へのプロモーション)

## 🛠️ 環境設定の前提条件

このガイドのワークフローを実行するには、以下の前提条件が必要です：

### 1. 必要なアカウントと権限

- **GitHub**: リポジトリへの書き込み権限
- **Cloudflare**: Cloudflare Pagesプロジェクトと適切なAPI権限
- **Node.js/PNPM**: ローカル開発環境

### 2. 事前に設定すべき環境

- **GitHub Environments**: `development`と`production`の環境を作成

  ```bash
  # GitHub CLIで環境を作成（または、GitHub UIから設定）
  gh api -X PUT repos/{owner}/{repo}/environments/development
  gh api -X PUT repos/{owner}/{repo}/environments/production
  ```

- **Cloudflare Pages**: プロジェクト`automationa-tools`の作成

  ```bash
  # Cloudflareダッシュボードでプロジェクト作成後、接続設定
  wrangler pages project create automationa-tools
  ```

- **シークレットと環境変数**: 本ドキュメントの[環境変数・シークレット管理](#5-環境変数シークレット管理)セクションを参照

### 3. ワークフローファイルの配置

```bash
# リポジトリのルートから実行
mkdir -p .github/workflows

# 開発環境CI/CDワークフロー
cat > .github/workflows/develop-ci.yml << 'EOL'
name: 開発環境 CI/CD
# このファイルの内容は後述
EOL

# 本番環境CI/CDワークフロー
cat > .github/workflows/production-ci.yml << 'EOL'
name: 本番環境 CI/CD
# このファイルの内容は後述
EOL

# プロモーションワークフロー
cat > .github/workflows/promote-to-production.yml << 'EOL'
name: 本番環境へのプロモーション
# このファイルの内容は後述
EOL
```

## 1. CI/CDパイプライン

プロジェクトのCI/CDパイプラインは、コードの品質保証と環境別のデプロイを自動化します。

### ブランチ戦略

| ブランチ             | トリガー     | デプロイ先         | 説明                               |
| -------------------- | ------------ | ------------------ | ---------------------------------- |
| `main`               | プッシュ、PR | 本番環境           | 安定版コード、ユーザー向け本番環境 |
| `develop`            | プッシュ、PR | 開発環境           | 開発中コード、テスト環境           |
| フィーチャーブランチ | PR           | なし（テストのみ） | 機能開発用の一時ブランチ           |

### CI/CDフロー概要

以下は、プロジェクトの自動化フローを図解したものです：

```
  開発者              GitHub              CI/CD パイプライン            Cloudflare Pages
    |                   |                        |                        |
    |-- コード変更 ---->|                        |                        |
    |                   |-- webhookトリガー ---->|                        |
    |                   |                        |                        |
    |                   |                        |-- 1. コード検証 ------>|
    |                   |                        |   (lint, test)         |
    |                   |                        |                        |
    |                   |                        |-- 2. ビルド ---------->|
    |                   |                        |   (env別設定)          |
    |                   |                        |                        |
    |                   |                        |-- 3. デプロイ -------->|
    |                   |                        |   (環境別)             |
    |                   |                        |                        |
    |                   |<----- ステータス通知 --|<----- デプロイ完了 ----|
    |                   |                        |                        |
    |<-- 結果確認 ------|                        |                        |
```

各ブランチに対応したCI/CDフローを設計することで、開発と本番の環境を明確に分離します：

1. **コード検証（共通）**

   - 型チェック: `pnpm type-check`
   - リント: `pnpm lint`
   - ユニットテスト: `pnpm test`
   - カバレッジチェック: `pnpm test:coverage`

2. **ビルド（環境別）**

   - 環境固有の変数を使用したビルド
   - Next.jsビルド: `pnpm build`
   - ビルド成果物の保存

3. **デプロイ（環境別）**
   - **開発環境** (`develop`ブランチ)
     - Cloudflare Pagesへのデプロイ（開発環境設定）
     - スモークテスト実行
     - デプロイURL: `https://512dca79.automationa-tools.pages.dev`
   - **本番環境** (`main`ブランチ)
     - Cloudflare Pagesへのデプロイ（本番環境設定）
     - 本番スモークテスト実行
     - デプロイURL: `https://main.automationa-tools.pages.dev`

### ワークフローの実行方法

#### ワークフローの手動実行

1. GitHubリポジトリページを開く
2. 「Actions」タブをクリック
3. 左側のワークフロー一覧から実行したいワークフローを選択（例：「開発環境 CI/CD」）
4. 「Run workflow」ボタンをクリック
5. ブランチを選択し、「Run workflow」をクリック

#### 自動実行のトリガー

- **`develop`ブランチへのプッシュ**：自動的に開発環境のCI/CDワークフローが実行されます
- **`main`ブランチへのプッシュ**：自動的に本番環境のCI/CDワークフローが実行されます
- **PRの作成・更新**：指定されたブランチへのPRでテストジョブが実行されます

#### 実行状況の確認

```bash
# 最近のワークフロー実行を一覧表示
gh run list --limit 5

# 特定のワークフローの実行を表示
gh run list --workflow develop-ci.yml

# 実行中のワークフローを表示
gh run list --status in_progress

# 特定の実行の詳細を表示
gh run view <実行ID>

# 特定の実行のログを表示
gh run view <実行ID> --log

# 失敗した実行のログだけを表示
gh run view <実行ID> --log-failed
```

### 環境別ワークフロー

環境を明確に分離するため、開発環境と本番環境それぞれに専用のワークフローファイルを用意します。以下のファイルを`.github/workflows/`ディレクトリに作成します。

#### 開発環境ワークフロー（.github/workflows/develop-ci.yml）

```yaml
name: 開発環境 CI/CD

# 開発環境向けワークフロー
# 対象: developブランチへのプッシュ・PR、または手動実行
on:
  push:
    branches: [develop]
    paths-ignore:
      - '**.md'
      - 'docs/**'
  pull_request:
    branches: [develop]
    paths-ignore:
      - '**.md'
      - 'docs/**'
  workflow_dispatch: # 手動実行も可能

# 実行の最適化（同時実行を防止）
concurrency:
  group: develop-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ステップ1: テストと検証
  lint-and-test:
    name: 型チェック・リント・テスト
    runs-on: ubuntu-latest
    steps:
      - name: ソースコードのチェックアウト
        uses: actions/checkout@v4

      - name: PNPMのセットアップ
        uses: pnpm/action-setup@v2
        with:
          version: 8.10.0

      - name: Node.jsのセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: 依存関係のインストール
        run: pnpm install

      - name: リント実行
        run: pnpm lint

      - name: 型チェック
        run: pnpm type-check

      - name: ユニットテスト実行
        run: pnpm test

      - name: テストカバレッジチェック
        run: pnpm test:coverage

      # PRの場合のみコメント追加
      - name: テスト結果のコメント
        if: github.event_name == 'pull_request'
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          recreate: true
          path: coverage/lcov-report/index.html

  # ステップ2: 開発環境向けビルド
  build-develop:
    name: 開発環境ビルド
    needs: [lint-and-test]
    runs-on: ubuntu-latest

    # プッシュまたは手動実行時のみビルド
    if: github.event_name == 'push' || github.event_name == 'workflow_dispatch'

    steps:
      - name: ソースコードのチェックアウト
        uses: actions/checkout@v4

      - name: PNPMのセットアップ
        uses: pnpm/action-setup@v2
        with:
          version: 8.10.0

      - name: Node.jsのセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      # ビルドキャッシュの活用
      - name: Next.jsキャッシュのセットアップ
        uses: actions/cache@v4
        with:
          path: |
            .next/cache
          key: ${{ runner.os }}-nextjs-development-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ hashFiles('**.[jt]s', '**.[jt]sx') }}
          restore-keys: |
            ${{ runner.os }}-nextjs-development-${{ hashFiles('**/pnpm-lock.yaml') }}-

      - name: 依存関係のインストール
        run: pnpm install

      # 開発環境固有の設定でビルド
      # 環境変数は実際の設定に合わせる
      - name: 開発環境向けビルド
        run: pnpm build
        env:
          NEXT_PUBLIC_ENV: development
          NEXT_PUBLIC_API_BASE_URL: /api
          NEXT_PUBLIC_APP_URL: https://512dca79.automationa-tools.pages.dev # スラッシュなし

      - name: ビルド成果物の保存
        uses: actions/upload-artifact@v4
        with:
          name: build-output-development
          path: out/
          retention-days: 1 # ビルド成果物は短期間のみ保持

  # ステップ3: 開発環境へのデプロイ
  deploy-develop:
    name: 開発環境デプロイ
    needs: [build-develop]
    runs-on: ubuntu-latest
    environment: development # GitHub環境を指定（環境変数・シークレットのスコープ）

    permissions:
      contents: read
      deployments: write

    steps:
      - name: ソースコードのチェックアウト
        uses: actions/checkout@v4

      - name: PNPMのセットアップ
        uses: pnpm/action-setup@v2
        with:
          version: 8.10.0

      - name: Node.jsのセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      # ビルド成果物を再利用
      - name: ビルド成果物のダウンロード
        uses: actions/download-artifact@v4
        with:
          name: build-output-development
          path: out/

      - name: 依存関係のインストール（本番用）
        run: pnpm install --prod

      # 開発環境へのデプロイ
      - name: Cloudflare Pagesへのデプロイ
        id: deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: pages deploy out --project-name=automationa-tools --branch=develop

      - name: デプロイURLの出力
        run: echo "✅ 開発環境がデプロイされました： ${{ steps.deploy.outputs.url }}"

      # デプロイ後の自動検証
      - name: スモークテスト
        run: |
          # 基本的な疎通確認
          curl -sSf "https://512dca79.automationa-tools.pages.dev" > /dev/null
          echo "スモークテスト成功"
```

#### 本番環境ワークフロー（.github/workflows/production-ci.yml）

```yaml
name: 本番環境 CI/CD

# 本番環境向けワークフロー
# 対象: mainブランチへのプッシュ・PR、または手動実行
on:
  push:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'
  pull_request:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'
  workflow_dispatch: # 手動実行も可能

# 実行の最適化（同時実行を防止）
concurrency:
  group: production-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ステップ1: テストと検証
  lint-and-test:
    name: 型チェック・リント・テスト
    runs-on: ubuntu-latest
    steps:
      - name: ソースコードのチェックアウト
        uses: actions/checkout@v4

      - name: PNPMのセットアップ
        uses: pnpm/action-setup@v2
        with:
          version: 8.10.0

      - name: Node.jsのセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: 依存関係のインストール
        run: pnpm install

      - name: リント実行
        run: pnpm lint

      - name: 型チェック
        run: pnpm type-check

      - name: ユニットテスト実行
        run: pnpm test

      - name: テストカバレッジチェック
        run: pnpm test:coverage

      # PRの場合のみコメント追加
      - name: テスト結果のコメント
        if: github.event_name == 'pull_request'
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          recreate: true
          path: coverage/lcov-report/index.html

  # ステップ2: 本番環境向けビルド
  build-production:
    name: 本番環境ビルド
    needs: [lint-and-test]
    runs-on: ubuntu-latest

    # プッシュまたは手動実行時のみビルド
    if: github.event_name == 'push' || github.event_name == 'workflow_dispatch'

    steps:
      - name: ソースコードのチェックアウト
        uses: actions/checkout@v4

      - name: PNPMのセットアップ
        uses: pnpm/action-setup@v2
        with:
          version: 8.10.0

      - name: Node.jsのセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      # ビルドキャッシュの活用
      - name: Next.jsキャッシュのセットアップ
        uses: actions/cache@v4
        with:
          path: |
            .next/cache
          key: ${{ runner.os }}-nextjs-production-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ hashFiles('**.[jt]s', '**.[jt]sx') }}
          restore-keys: |
            ${{ runner.os }}-nextjs-production-${{ hashFiles('**/pnpm-lock.yaml') }}-

      - name: 依存関係のインストール
        run: pnpm install

      # 本番環境固有の設定でビルド
      # スラッシュの有無に注意（実際の設定に合わせる）
      - name: 本番環境向けビルド
        run: pnpm build
        env:
          NEXT_PUBLIC_ENV: production
          NEXT_PUBLIC_API_BASE_URL: /api
          NEXT_PUBLIC_APP_URL: https://main.automationa-tools.pages.dev/

      - name: ビルド成果物の保存
        uses: actions/upload-artifact@v4
        with:
          name: build-output-production
          path: out/
          retention-days: 1 # ビルド成果物は短期間のみ保持

  # ステップ3: 本番環境へのデプロイ
  deploy-production:
    name: 本番環境デプロイ
    needs: [build-production]
    runs-on: ubuntu-latest
    environment: production # GitHub環境を指定（環境変数・シークレットのスコープ）

    permissions:
      contents: read
      deployments: write

    steps:
      - name: ソースコードのチェックアウト
        uses: actions/checkout@v4

      - name: PNPMのセットアップ
        uses: pnpm/action-setup@v2
        with:
          version: 8.10.0

      - name: Node.jsのセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      # ビルド成果物を再利用
      - name: ビルド成果物のダウンロード
        uses: actions/download-artifact@v4
        with:
          name: build-output-production
          path: out/

      - name: 依存関係のインストール（本番用）
        run: pnpm install --prod

      # 本番環境へのデプロイ
      - name: Cloudflare Pagesへのデプロイ
        id: deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: pages deploy out --project-name=automationa-tools --branch=main

      - name: デプロイURLの出力
        run: echo "✅ 本番環境がデプロイされました： ${{ steps.deploy.outputs.url }}"

      # デプロイ後の自動検証（より厳格）
      - name: 本番スモークテスト
        run: |
          # 基本的な疎通確認
          curl -sSf "https://main.automationa-tools.pages.dev/" > /dev/null

          # ステータスコード確認
          STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://main.automationa-tools.pages.dev/")
          if [ "$STATUS_CODE" -ne 200 ]; then
            echo "エラー: ステータスコードが200ではありません: $STATUS_CODE"
            exit 1
          fi

          echo "本番スモークテスト成功"

      # 通知
      - name: 検証結果の通知
        if: always()
        uses: rtCamp/action-slack-notify@v2
        env:
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK || '' }}
          SLACK_CHANNEL: deployments
          SLACK_COLOR: ${{ job.status == 'success' && 'good' || 'danger' }}
          SLACK_TITLE: 本番デプロイ検証 ${{ job.status == 'success' && '✅ 成功' || '❌ 失敗' }}
          SLACK_MESSAGE: |
            環境: 本番
            URL: https://main.automationa-tools.pages.dev/
            ステータス: ${{ job.status }}
```

### 本番デプロイ後の検証ワークフロー（.github/workflows/post-deploy-verification.yml）

本番環境デプロイ後に自動的に実行される検証テストです：

```yaml
name: デプロイ後検証

on:
  workflow_run:
    workflows: ['本番環境 CI/CD']
    types:
      - completed
    branches:
      - main

jobs:
  verify-production:
    name: 本番環境検証
    # デプロイワークフローが成功した場合のみ実行
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest

    steps:
      - name: リポジトリのチェックアウト
        uses: actions/checkout@v4

      # 基本検証
      - name: 本番環境の基本検証
        run: |
          # ステータスコード確認
          STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://main.automationa-tools.pages.dev/)
          if [ "$STATUS_CODE" -ne 200 ]; then
            echo "エラー: ステータスコードが200ではありません: $STATUS_CODE"
            exit 1
          fi

          # コンテンツ確認
          CONTENT=$(curl -s https://main.automationa-tools.pages.dev/)
          if ! echo "$CONTENT" | grep -q "Automationa Tools"; then
            echo "エラー: 期待されるコンテンツが見つかりません"
            exit 1
          fi

          echo "✅ 基本検証: 成功"

      # 詳細検証
      - name: Playwrightのセットアップ
        uses: microsoft/playwright-github-action@v1

      - name: PNPMのセットアップ
        uses: pnpm/action-setup@v2
        with:
          version: 8.10.0

      - name: Node.jsのセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: 依存関係のインストール
        run: |
          pnpm install
          pnpm exec playwright install --with-deps chromium

      # E2Eテスト
      - name: 本番E2Eテスト
        run: pnpm test:e2e:prod
        env:
          PLAYWRIGHT_TEST_BASE_URL: https://main.automationa-tools.pages.dev/

      # 通知
      - name: 検証結果の通知
        if: always()
        uses: rtCamp/action-slack-notify@v2
        env:
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK || '' }}
          SLACK_CHANNEL: deployments
          SLACK_COLOR: ${{ job.status == 'success' && 'good' || 'danger' }}
          SLACK_TITLE: 本番デプロイ検証 ${{ job.status == 'success' && '✅ 成功' || '❌ 失敗' }}
          SLACK_MESSAGE: |
            環境: 本番
            URL: https://main.automationa-tools.pages.dev/
            ステータス: ${{ job.status }}
```

## 2. データベースマイグレーション自動化

データベースの変更を安全に適用するための自動化を設定します。このプロジェクトではCloudflare D1を使用しています。

### マイグレーションワークフロー

以下のワークフローファイルを`.github/workflows/database-migration.yml`として追加します：

```yaml
name: データベースマイグレーション

# 手動または特定のファイル変更時に実行
on:
  workflow_dispatch:
    inputs:
      environment:
        description: '適用環境（development/production）'
        required: true
        default: 'development'
        type: choice
        options:
          - development
          - production
  push:
    branches: [develop, main]
    paths:
      - 'db/migrations/**'

jobs:
  migrate:
    name: マイグレーション実行
    runs-on: ubuntu-latest
    # 指定された環境に基づいて実行環境を設定
    environment: ${{ github.event.inputs.environment || (github.ref == 'refs/heads/main' && 'production' || 'development') }}

    steps:
      - name: リポジトリのチェックアウト
        uses: actions/checkout@v4

      - name: PNPMのセットアップ
        uses: pnpm/action-setup@v2
        with:
          version: 8.10.0

      - name: Node.jsのセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: 依存関係のインストール
        run: pnpm install

      # マイグレーション前のバックアップ
      - name: データベースバックアップ
        run: pnpm db:backup
        env:
          CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CF_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
          D1_DATABASE_NAME: ${{ vars.D1_DATABASE_NAME }}
          D1_DATABASE_ID: ${{ secrets.D1_DATABASE_ID }}
          R2_BACKUPS_BUCKET_NAME: ${{ vars.R2_BACKUPS_BUCKET_NAME }}

      # マイグレーション実行
      - name: マイグレーション適用
        run: pnpm db:migrate
        env:
          CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CF_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
          D1_DATABASE_NAME: ${{ vars.D1_DATABASE_NAME }}
          D1_DATABASE_ID: ${{ secrets.D1_DATABASE_ID }}
          ENVIRONMENT: ${{ vars.ENVIRONMENT }}

      # 結果通知
      - name: マイグレーション結果通知
        if: always()
        uses: rtCamp/action-slack-notify@v2
        env:
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK || '' }}
          SLACK_CHANNEL: deployments
          SLACK_COLOR: ${{ job.status == 'success' && 'good' || 'danger' }}
          SLACK_TITLE: データベースマイグレーション ${{ job.status == 'success' && '✅ 成功' || '❌ 失敗' }}
          SLACK_MESSAGE: |
            環境: ${{ vars.ENVIRONMENT }}
            データベース: ${{ vars.D1_DATABASE_NAME }}
            ステータス: ${{ job.status }}
```

### マイグレーションファイルの構造

マイグレーションファイルは以下のディレクトリ構造で管理します：

```
プロジェクトルート/
  ├── db/
  │   ├── migrations/
  │   │   ├── 001_create_users_table.sql
  │   │   ├── 002_add_email_column.sql
  │   │   └── ...
  │   └── schema.sql  # 最新のスキーマ
  └── ...
```

### マイグレーションスクリプト

`package.json`に以下のスクリプトを追加します：

```json
{
  "scripts": {
    "db:migrate": "node scripts/db/migrate.js",
    "db:backup": "node scripts/db/backup.js"
  }
}
```

### マイグレーションコマンド（ローカル実行）

開発中に手動でマイグレーションを実行したい場合は以下のコマンドを使用します：

```bash
# 開発環境のマイグレーション
pnpm db:migrate --env=development

# 本番環境のマイグレーション（注意して使用）
pnpm db:migrate --env=production
```

### マイグレーションのベストプラクティス

1. **変更はべき等に**

   - マイグレーションは何度実行しても同じ結果になるようにする
   - `CREATE TABLE IF NOT EXISTS`などの条件付き操作を使用

2. **バックアップから復元をテスト**

   - マイグレーション前にバックアップを取得
   - バックアップからの復元手順を文書化し、テスト

3. **ダウンマイグレーション**

   - 可能であれば各マイグレーションに対応するロールバックスクリプトを用意
   - 例: `001_up.sql`と`001_down.sql`

4. **マイグレーション履歴の管理**
   - マイグレーション履歴をデータベース内のテーブルで管理
   - どのマイグレーションが適用されたかを追跡

## 4. テスト自動化

テストを自動化して、コードの品質を確保します。様々なテストタイプを網羅的に実行します。

### テスト戦略

| テストタイプ       | 目的                             | ツール     | 実行タイミング           |
| ------------------ | -------------------------------- | ---------- | ------------------------ |
| **単体テスト**     | 個々の関数やコンポーネントの検証 | Jest       | すべてのPR、プッシュ     |
| **統合テスト**     | 複数のコンポーネント間の連携検証 | Jest       | すべてのPR、プッシュ     |
| **E2Eテスト**      | ユーザー視点での機能検証         | Playwright | PRのマージ前、デプロイ前 |
| **視覚回帰テスト** | UI変更の検出                     | Playwright | UI関連PRのマージ前       |

### テスト実行ワークフロー

特定のテストのみを実行するためのワークフローファイル（`.github/workflows/e2e-tests.yml`）：

```yaml
name: E2Eテスト実行

# 手動または特定の条件で実行
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'テスト対象環境'
        required: true
        default: 'development'
        type: choice
        options:
          - development
          - production
  pull_request:
    types: [labeled]
    branches: [main]

jobs:
  e2e-tests:
    # PRに 'needs-e2e-tests' ラベルが付いた場合、または手動実行時
    if: github.event.inputs.environment != null || contains(github.event.pull_request.labels.*.name, 'needs-e2e-tests')
    name: E2Eテスト
    runs-on: ubuntu-latest

    steps:
      - name: リポジトリのチェックアウト
        uses: actions/checkout@v4

      - name: PNPMのセットアップ
        uses: pnpm/action-setup@v2
        with:
          version: 8.10.0

      - name: Node.jsのセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: 依存関係のインストール
        run: pnpm install

      # Playwrightのセットアップ
      - name: Playwrightのインストール
        run: pnpm exec playwright install --with-deps

      # テスト環境の決定
      - name: テスト環境URLの設定
        id: set-url
        run: |
          if [[ "${{ github.event.inputs.environment }}" == "production" || "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "TEST_URL=https://main.automationa-tools.pages.dev/" >> $GITHUB_ENV
            echo "ENVIRONMENT=production" >> $GITHUB_ENV
          else
            echo "TEST_URL=https://512dca79.automationa-tools.pages.dev" >> $GITHUB_ENV
            echo "ENVIRONMENT=development" >> $GITHUB_ENV
          fi

      # E2Eテストの実行
      - name: E2Eテスト実行
        run: pnpm test:e2e
        env:
          PLAYWRIGHT_TEST_BASE_URL: ${{ env.TEST_URL }}

      # テスト結果を保存
      - name: テスト結果の保存
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      # PRコメントの追加
      - name: テスト結果サマリー
        if: github.event_name == 'pull_request' && always()
        uses: actions/github-script@v6
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const fs = require('fs');
            try {
              const summary = fs.readFileSync('playwright-report/summary.md', 'utf8');
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `## E2Eテスト結果 (${{ env.ENVIRONMENT }})

                ${summary}

                [詳細レポートはこちら](${process.env.GITHUB_SERVER_URL}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})`
              });
            } catch (error) {
              console.error('テスト結果ファイルの読み取りに失敗しました:', error);
            }
```

### テストコマンド（ローカル実行）

開発中にローカルでテストを実行するコマンド：

```bash
# 単体テスト・統合テスト
pnpm test

# E2Eテスト
pnpm test:e2e

# 特定のテストファイルのみ実行
pnpm test -- path/to/test.ts

# テストカバレッジレポート生成
pnpm test:coverage
```

### テスト設定ファイル

#### Jestの設定（`jest.config.js`）

```js
/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/*.stories.tsx'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

export default config;
```

#### Playwrightの設定（`playwright.config.ts`）

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['json', { outputFile: 'playwright-report/results.json' }], ['github']],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
      },
});
```

### テスト自動化のベストプラクティス

1. **テストピラミッド方式**

   - 単体テスト > 統合テスト > E2Eテスト の比率を意識
   - 下層のテストほど多く、上層のテストほど厳選

2. **テスト環境の分離**

   - テスト用の分離された環境を用意
   - テストデータとプロダクションデータを明確に分離

3. **デバッグ容易性**

   - 失敗時のスクリーンショットと動画記録
   - 詳細なログとエラーメッセージ

4. **テスト戦略の文書化**

   - 何をテストするか、しないかを明確に定義
   - テスト条件と受け入れ基準を明確化

5. **テストコードの保守**
   - テストコードも通常のコードと同様にレビュー
   - 重複を避け、再利用可能なテスト関数を作成
