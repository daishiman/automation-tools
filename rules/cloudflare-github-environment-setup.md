# Cloudflare・GitHub環境分離設定ガイド

このドキュメントでは、Cloudflareサービス（Pages, D1, KV, R2）とGitHubを連携させた開発環境と本番環境の分離設定について説明します。

## 目次

1. [全体アーキテクチャ](#全体アーキテクチャ)
2. [Cloudflare環境設定](#cloudflare環境設定)
3. [GitHub環境設定](#github環境設定)
4. [環境変数管理](#環境変数管理)
5. [デプロイワークフロー](#デプロイワークフロー)
6. [トラブルシューティング](#トラブルシューティング)

## 全体アーキテクチャ

MVPアプリケーションでは、以下の環境分離構造を採用しています：

| 項目                 | 開発環境（preview）                                         | 本番環境（production）                              | ローカル環境（local）                                                                   |
| -------------------- | ----------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **ブランチ**         | develop                                                     | main                                                | -                                                                                       |
| **URL**              | develop.automationa-tools.pages.dev                         | automationa-tools.pages.dev                         | http://localhost:3000                                                                   |
| **Cloudflare環境**   | preview                                                     | production                                          | local                                                                                   |
| **データベース**     | automationa-tools-dev-db                                    | automationa-tools-db                                | automationa-tools-local-db                                                              |
| **KVネームスペース** | CACHE_DEV, SESSION_STORE_DEV                                | CACHE_PROD, SESSION_STORE_PROD                      | CACHE_DEV, SESSION_STORE_DEV（ローカルエミュレーション）                                |
| **R2バケット**       | dev-automationa-tools-storage, dev-automationa-tools-backup | automationa-tools-storage, automationa-tools-backup | dev-automationa-tools-storage, dev-automationa-tools-backup（ローカルエミュレーション） |
| **承認フロー**       | 最小限                                                      | 必要                                                | なし                                                                                    |

## Cloudflare環境設定

### 0. 環境の用途区分

Cloudflareの環境は以下の用途で使い分けます：

| 環境                       | 用途                       | 特徴                                             |
| -------------------------- | -------------------------- | ------------------------------------------------ |
| **本番環境（production）** | 一般ユーザーが利用する環境 | 安定性重視、厳格なデプロイ承認フロー、本番データ |
| **開発環境（preview）**    | 開発者がテストする環境     | 頻繁な更新、自動デプロイ、テストデータ           |

**環境分離のメリット**:

- リスク分散：開発環境での変更が本番環境に影響しない
- 並行開発：複数の機能を同時に開発可能
- テスト環境：実環境に近い状態でテスト可能
- デプロイ安全性：段階的なデプロイで品質確保

### 1. 既存の本番環境に開発環境を追加する手順

既に本番環境（production）がCloudflareに設定されている場合、以下の手順で開発環境（preview）を追加します：

#### 1.1 Cloudflare Pagesプロジェクトに開発環境を追加

1. Cloudflareダッシュボードにログイン
2. Workers & Pagesセクションに移動
3. 既存のプロジェクトを選択
4. Settings > Branches and deployments > Preview / Production
5. Production branchesセクションの"Add new branch"をクリック
   - Main branch: `main`（これが本番環境）
   - Preview branch: `develop`（これが開発環境）
6. Preview/Development Setting欄で必要な環境変数を設定

   ```
   # 開発環境用基本設定
   NEXT_PUBLIC_APP_URL=https://512dca79.automationa-tools.pages.dev/
   NEXT_PUBLIC_API_BASE_URL=/api
   ENVIRONMENT=development
   DEBUG=true

   # 認証設定
   AUTH_SECRET=auth_secret_change_me
   JWT_SECRET=jwt_secret_change_me
   NEXTAUTH_SECRET=auth_secret_change_me
   NEXTAUTH_URL=https://512dca79.automationa-tools.pages.dev/

   # Cloudflare アカウント設定
   CF_ACCOUNT_ID=b3dde7be1cd856788fc47595ac455475

   # D1データベース設定
   D1_DATABASE_ID=5963fc08-9ad1-40ff-95bd-4a7bf06f2d33
   D1_DATABASE_NAME=automationa-tools-dev-db
   D1_DATABASE_BINDING=DB

   # KVネームスペース設定
   KV_SESSION_STORE_ID=90d645d4e30a42e5b5f65d238de4d86e
   KV_SESSION_STORE_BINDING=SESSION_STORE_DEV
   KV_CACHE_ID=72df5df3c94d4881b0e789b970c8392a
   KV_CACHE_BINDING=CACHE_DEV

   # R2バケット設定
   R2_ASSETS_BUCKET_NAME=dev-automationa-tools-storage
   R2_ASSETS_BINDING=ASSETS
   R2_BACKUPS_BUCKET_NAME=dev-automationa-tools-backup
   R2_BACKUPS_BINDING=BACKUPS
   ```

#### 1.2 D1データベースの開発環境版を作成

```bash
# 開発環境用のD1データベース作成
wrangler d1 create automationa-tools-dev-db

# 作成されたデータベースIDをメモ
# 出力例: Database created with id: 5963fc08-9ad1-40ff-95bd-4a7bf06f2d33
```

作成したデータベースIDを`wrangler.toml`の開発環境設定に追加：

```toml
[[env.preview.d1_databases]]
binding = "DB"
database_name = "automationa-tools-dev-db"
database_id = "5963fc08-9ad1-40ff-95bd-4a7bf06f2d33"
migrations_dir = "migrations"
```

#### 1.3 KVネームスペースの開発環境版を作成

```bash
# 開発環境用のキャッシュKVネームスペース作成
wrangler kv:namespace create "CACHE_DEV"

# 開発環境用のセッションストアKVネームスペース作成
wrangler kv:namespace create "SESSION_STORE_DEV"

# 作成されたKV IDをメモ
# 出力例:
# CACHE_DEV: Add the following to your configuration file:
# kv_namespaces = [
#   { binding = "CACHE_DEV", id = "72df5df3c94d4881b0e789b970c8392a" }
# ]
#
# SESSION_STORE_DEV: Add the following to your configuration file:
# kv_namespaces = [
#   { binding = "SESSION_STORE_DEV", id = "90d645d4e30a42e5b5f65d238de4d86e" }
# ]
```

このIDを`wrangler.toml`の開発環境設定に追加：

```toml
[[env.preview.kv_namespaces]]
binding = "CACHE_DEV"
id = "72df5df3c94d4881b0e789b970c8392a"

[[env.preview.kv_namespaces]]
binding = "SESSION_STORE_DEV"
id = "90d645d4e30a42e5b5f65d238de4d86e"
```

#### 1.4 R2バケットの開発環境版を作成

1. Cloudflareダッシュボード > R2に移動
2. "Create bucket"をクリック
3. バケット名を`dev-automationa-tools-storage`と入力（アセット用）
4. 同様に`dev-automationa-tools-backup`を作成（バックアップ用）
5. Locationは適切なものを選択
6. "Create bucket"をクリック

作成したバケットを`wrangler.toml`に追加：

```toml
[[env.preview.r2_buckets]]
binding = "R2_ASSETS"
bucket_name = "dev-automationa-tools-storage"

[[env.preview.r2_buckets]]
binding = "R2_BACKUPS"
bucket_name = "dev-automationa-tools-backup"
```

#### 1.5 カスタムドメインの設定（オプション）

開発環境に専用のサブドメインを設定する場合：

1. Cloudflareダッシュボード > Websites > yourdomain.comに移動
2. DNS > Recordsセクションで"Add record"をクリック
3. Type: CNAME, Name: dev.app, Content: pages.dev（自動生成URL）
4. "Save"をクリック

Workers & Pages > プロジェクト > Custom domainsで開発環境用のドメインを追加：

```
dev.app.yourdomain.com → [プロジェクト名].pages.dev（開発環境）
```

### 2. 開発環境と本番環境の切り替え方法

#### コマンドラインでの切り替え

```bash
# 開発環境操作
wrangler pages dev --env=preview
wrangler pages deploy ./out --env=preview

# 本番環境操作
wrangler pages dev --env=production
wrangler pages deploy ./out --env=production

# ローカル環境操作
wrangler pages dev --env=local
```

#### Webコンソールでの切り替え

1. Cloudflareダッシュボード > Workers & Pages > プロジェクト選択
2. Deploymentsタブで、Productionデプロイと、Previewデプロイを確認・管理
3. 各環境ごとに "View"ボタンから実際の環境にアクセス可能

### 3. wrangler.toml/wrangler.jsonの設定

Cloudflareの環境設定は`wrangler.toml`または`wrangler.json`ファイルで管理します：

> **注意**: Wrangler v3.91.0以降は、TOML形式（`wrangler.toml`）とJSON形式（`wrangler.json`または`wrangler.jsonc`）の両方をサポートしています。現在の推奨形式はTOML（`wrangler.toml`）です。

```toml
# 共通設定（トップレベル）
name = "automationa-tools"
compatibility_date = "2023-06-28"
compatibility_flags = [ "nodejs_compat" ]
pages_build_output_dir = "out"  # Cloudflare Pagesのビルド出力ディレクトリ
build.command = "pnpm run build"

# ローカル開発用の共通変数
[vars]
APP_NAME = "Automationa Tools Local"
ENVIRONMENT = "local"
DATABASE = "local"
NODE_ENV = "development"

# ローカル開発用のD1データベース設定
[[d1_databases]]
binding = "DB"
database_name = "automationa-tools-local-db"
database_id = "5963fc08-9ad1-40ff-95bd-4a7bf06f2d33" # 開発環境IDを使用
migrations_dir = "migrations"

# ローカル開発用のKVネームスペース設定
[[kv_namespaces]]
binding = "CACHE_DEV"  # ローカル環境用キャッシュバインディング
id = "72df5df3c94d4881b0e789b970c8392a"

[[kv_namespaces]]
binding = "SESSION_STORE_DEV"  # ローカル環境用セッションストアバインディング
id = "90d645d4e30a42e5b5f65d238de4d86e"

# ローカル開発用のR2バケット設定
[[r2_buckets]]
binding = "R2_ASSETS"  # ローカル環境アセットストレージ
bucket_name = "dev-automationa-tools-storage"

[[r2_buckets]]
binding = "R2_BACKUPS"  # ローカル環境バックアップストレージ
bucket_name = "dev-automationa-tools-backup"

# 本番環境設定
[env.production]
env_path = ".env.production"

# 環境変数設定（プロダクション）
[env.production.vars]
APP_NAME = "Automationa Tools"
ENVIRONMENT = "production"
DATABASE = "prod"
NODE_ENV = "production"

# D1データベース設定（プロダクション）
[[env.production.d1_databases]]
binding = "DB"  # バインディング名
database_name = "automationa-tools-db"  # Cloudflare DashboardのD1データベース名
database_id = "4d785c13-dd93-4147-8a2b-d40007e11914"
migrations_dir = "migrations"

# KVネームスペース設定（プロダクション）
[[env.production.kv_namespaces]]
binding = "CACHE_PROD"  # 本番環境用キャッシュバインディング
id = "6dc7acecf2b746218fa00515779bbad6"

[[env.production.kv_namespaces]]
binding = "SESSION_STORE_PROD"  # 本番環境用セッションストアバインディング
id = "219568a615f74a998fd12d1af6648e6c"

# R2バケット設定（プロダクション）
[[env.production.r2_buckets]]
binding = "R2_ASSETS"  # 本番環境アセットストレージ
bucket_name = "automationa-tools-storage"

[[env.production.r2_buckets]]
binding = "R2_BACKUPS"  # 本番環境バックアップストレージ
bucket_name = "automationa-tools-backup"

# 開発環境設定（preview）
[env.preview]
env_path = ".env.preview"  # .env.previewファイルを使用するように設定

# 環境変数設定（プレビュー）
[env.preview.vars]
APP_NAME = "automationa-tools-preview"
ENVIRONMENT = "preview"
DATABASE = "preview"
NODE_ENV = "development"

# D1データベース設定（プレビュー）
[[env.preview.d1_databases]]
binding = "DB"  # バインディング名
database_name = "automationa-tools-dev-db"  # Cloudflare DashboardのD1データベース名
database_id = "5963fc08-9ad1-40ff-95bd-4a7bf06f2d33"
migrations_dir = "migrations"

# KVネームスペース設定（プレビュー）
[[env.preview.kv_namespaces]]
binding = "CACHE_DEV"  # 開発環境用キャッシュバインディング
id = "72df5df3c94d4881b0e789b970c8392a"

[[env.preview.kv_namespaces]]
binding = "SESSION_STORE_DEV"  # 開発環境用セッションストアバインディング
id = "90d645d4e30a42e5b5f65d238de4d86e"

# R2バケット設定（プレビュー）
[[env.preview.r2_buckets]]
binding = "R2_ASSETS"  # 開発環境アセットストレージ
bucket_name = "dev-automationa-tools-storage"

[[env.preview.r2_buckets]]
binding = "R2_BACKUPS"  # 開発環境バックアップストレージ
bucket_name = "dev-automationa-tools-backup"
```

### 2. Cloudflareダッシュボードでの初期設定

#### 2.1 プロジェクト作成

1. Cloudflareダッシュボードにログイン
2. Workers & Pages > Create application を選択
3. アプリケーション名を入力（例：`automationa-tools`）
4. フレームワークを選択（例：Next.js）
5. 環境変数を設定する場合は「Environment variables」セクションで追加

#### 2.2 環境の作成

各サービスの環境を作成します：

##### D1データベース

1. Cloudflareダッシュボード > D1 > Create database
2. 本番用データベース名：`automationa-tools-db`
3. 開発用データベース名：`automationa-tools-dev-db`
4. 各データベースIDをメモして`wrangler.toml`に設定

##### KVネームスペース

1. Cloudflareダッシュボード > Workers > KV > Create namespace
2. 本番用KV名：`CACHE_PROD`と`SESSION_STORE_PROD`（IDをメモ）
3. 開発用KV名：`CACHE_DEV`と`SESSION_STORE_DEV`（IDをメモ）

##### R2バケット

1. Cloudflareダッシュボード > R2 > Create bucket
2. 本番用バケット名：`automationa-tools-storage`と`automationa-tools-backup`
3. 開発用バケット名：`dev-automationa-tools-storage`と`dev-automationa-tools-backup`
4. 必要に応じてローカル開発用にもバケットを設定

### 3. コマンドラインからの操作

環境を指定してコマンドを実行する場合：

```bash
# 開発環境への操作
wrangler d1 execute automationa-tools-dev-db --command="SELECT * FROM users" --env=preview
wrangler kv:key get KEY --namespace-id=72df5df3c94d4881b0e789b970c8392a --env=preview
wrangler kv:key get KEY --namespace-id=90d645d4e30a42e5b5f65d238de4d86e --env=preview
wrangler r2 object get dev-automationa-tools-storage file.txt --env=preview

# 本番環境への操作
wrangler d1 execute automationa-tools-db --command="SELECT * FROM users" --env=production
wrangler kv:key get KEY --namespace-id=6dc7acecf2b746218fa00515779bbad6 --env=production
wrangler kv:key get KEY --namespace-id=219568a615f74a998fd12d1af6648e6c --env=production
wrangler r2 object get automationa-tools-storage file.txt --env=production
```

## GitHub環境設定

### 1. リポジトリブランチの設定

1. メインブランチを`main`（本番環境）に設定
2. 開発ブランチとして`develop`を作成
3. ブランチ保護ルールを設定

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# developブランチの作成
git checkout -b develop
git push -u origin develop
```

### 2. GitHub Environmentsの設定

GitHub Repositoryの設定で環境を作成します：

1. リポジトリページ > Settings > Environments > New environment
2. `production`環境と`preview`環境を作成

#### 本番環境（production）の設定

- 設定 > Environments > production
- Deployment branches: Protected branches only (main)
- Required reviewers: レビュアーを追加（通常2名以上）
- Wait timer: 30秒（オプション）
- Environment secrets: 本番環境用のシークレットを追加

#### 開発環境（preview）の設定

- 設定 > Environments > preview
- Deployment branches: Selected branches only (develop)
- Required reviewers: 必要に応じて設定（通常1名）
- Environment secrets: 開発環境用のシークレットを追加

### 3. ブランチ保護ルールの設定

リポジトリページ > Settings > Branches > Branch protection rules

#### mainブランチ（本番環境）の保護

- Branch name pattern: `main`
- Require pull request reviews before merging: 有効
- Required number of approvals: 2
- Require status checks to pass before merging: 有効 (lint, test, build)
- Require branches to be up to date before merging: 有効
- Include administrators: 有効

#### developブランチ（開発環境）の保護

- Branch name pattern: `develop`
- Require pull request reviews before merging: 有効
- Required number of approvals: 1
- Require status checks to pass before merging: 有効 (lint, test)
- Require branches to be up to date before merging: 有効

## 環境変数管理

### 1. ローカル開発用.envファイルの管理

ローカル開発環境で使用する環境変数は、`.env`ファイルで管理します：

#### .envファイルの構成

プロジェクトルートに以下のファイルを作成します：

- `.env.development` - 開発環境（preview）用の環境変数
- `.env.production` - 本番環境用の環境変数
- `.env.local` - ローカル開発環境用の環境変数（ローカルマシンでのみ使用）
- `.env.example` - 環境変数のテンプレート（実際の値は含めない）

```bash
# .env.example（リポジトリにコミット）
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_API_BASE_URL=
ENVIRONMENT=
DEBUG=
AUTH_SECRET=
JWT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# .env.development（開発環境用）
NEXT_PUBLIC_APP_URL=https://main.automationa-tools.pages.dev/
NEXT_PUBLIC_API_BASE_URL=/api
ENVIRONMENT=development
DEBUG=true

# .env.local（コミットしない - ローカル開発用）
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=/api
ENVIRONMENT=local
DEBUG=true
WRANGLER_LOCAL=true
WRANGLER_LOG_LEVEL=debug
WRANGLER_HOT_RELOAD=true
```

#### .gitignoreの設定

秘密情報を含む.envファイルはリポジトリにコミットしないよう、`.gitignore`ファイルに追加します：

```
# .gitignore
.env
.env.development
.env.production
.env.local
.dev.vars
```

#### 安全な.env管理方法

1. チーム内での環境変数の共有：

   - パスワードマネージャーの利用
   - 暗号化されたメッセージングの使用
   - 専用の環境変数管理ツール（Doppler, HashiCorp Vault等）の利用

2. ローカル開発での.envファイル読み込み：

   ```bash
   # Node.js/npmの場合
   pnpm install dotenv

   # 環境ごとに読み込むファイルを切り替え
   npx cross-env NODE_ENV=development node -r dotenv/config index.js
   ```

3. Wranglerでのローカル環境変数：

   ```bash
   # .dev.varsファイルを作成（wrangler用）
   echo "API_KEY=local_dev_key" > .dev.vars

   # ローカル実行時に読み込む
   wrangler pages dev --env=preview
   ```

### 2. GitHub Actionsの環境変数

GitHub Actionsで使用する環境変数は、セキュリティレベルに応じて2つの場所で管理できます。

#### 2.1 リポジトリシークレット（共通）

すべての環境から参照できる共通シークレットです。機密性の低い値や、すべての環境で共通の値に使用します。

**設定方法**:

1. GitHubリポジトリページに移動
2. Settings > Secrets and variables > Actions を選択
3. Repository secrets タブを選択
4. 「New repository secret」ボタンをクリック
5. 名前と値を入力して保存

**必要なリポジトリシークレット**:

- `CF_ACCOUNT_ID`: Cloudflareアカウント識別子（b3dde7be1cd856788fc47595ac455475）
- `GITHUB_TOKEN`: GitHub API操作用トークン（自動で提供されるため通常は設定不要）
- `GITHUB_OWNER`: GitHubオーナー名（リポジトリ所有者のユーザー名またはOrg名）
- `GITHUB_REPO`: リポジトリ名（automationa-tools）

#### 2.2 環境シークレット（環境固有）

特定の環境でのみ使用されるシークレットです。環境ごとに異なる値を持つ場合や、本番環境のみで必要な機密情報の場合に使用します。

**設定方法**:

1. GitHubリポジトリページに移動
2. Settings > Environments を選択
3. 該当の環境を選択（ない場合は「New environment」で作成）
4. Environment secrets セクションで「Add secret」をクリック
5. 名前と値を入力して保存

**production環境のシークレット**:

- `CF_API_TOKEN`: 本番環境用Cloudflareトークン（必要最小限の権限を付与）
- `OPENAI_API_KEY`: 本番環境用OpenAI APIキー
- `AUTH_SECRET`: 認証用シークレット
- `JWT_SECRET`: JWT署名用シークレット
- `NEXTAUTH_SECRET`: NextAuth用シークレット
- `PR_BASE_BRANCH`: PRのベースブランチ（main）

**preview環境のシークレット**:

- `CF_API_TOKEN`: 開発環境用Cloudflareトークン（権限制限あり）
- `OPENAI_API_KEY`: 開発環境用OpenAI APIキー
- `AUTH_SECRET`: 開発環境用認証シークレット
- `JWT_SECRET`: 開発環境用JWT署名シークレット
- `NEXTAUTH_SECRET`: 開発環境用NextAuthシークレット
- `PR_BASE_BRANCH`: PRのベースブランチ（develop）

#### 2.3 リポジトリ変数（非機密情報）

機密性のない設定値は、GitHub Actionsの変数として設定できます。これらはログに表示されても問題ない情報です。

**設定方法**:

1. GitHubリポジトリページに移動
2. Settings > Secrets and variables > Actions を選択
3. Variables タブを選択
4. 「New repository variable」ボタンをクリック
5. 名前と値を入力して保存

**共通変数の例**:

- `PROJECT_NAME`: automationa-tools
- `NODE_VERSION`: 18
- `PNPM_VERSION`: 8
- `TZ`: Asia/Tokyo

#### 2.4 環境変数（環境固有の非機密情報）

特定の環境でのみ使用される非機密情報は、環境変数として設定できます。

**設定方法**:

1. GitHubリポジトリページに移動
2. Settings > Environments を選択
3. 該当の環境を選択
4. Environment variables セクションで「Add variable」をクリック
5. 名前と値を入力して保存

**production環境の変数**:

- `ENVIRONMENT`: production
- `NEXT_PUBLIC_APP_URL`: https://main.automationa-tools.pages.dev/
- `PR_DRAFT`: false

**preview環境の変数**:

- `ENVIRONMENT`: preview
- `NEXT_PUBLIC_APP_URL`: https://512dca79.automationa-tools.pages.dev/
- `PR_DRAFT`: true

#### 2.5 GitHub Actionsでの環境変数の使用

ワークフローYAMLファイルで環境変数を設定・使用する例：

```yaml
jobs:
  deploy:
    name: デプロイ
    runs-on: ubuntu-latest
    # 現在のブランチに応じて環境を選択
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'preview' }}

    steps:
      # 環境変数の設定
      - name: 環境変数設定
        run: |
          echo "CF_ENVIRONMENT=${{ github.ref == 'refs/heads/main' && 'production' || 'preview' }}" >> $GITHUB_ENV
          echo "NODE_VERSION=${{ vars.NODE_VERSION || '18' }}" >> $GITHUB_ENV
          echo "DEPLOYMENT_TIME=$(date +'%Y-%m-%d %H:%M:%S')" >> $GITHUB_ENV

      # 環境変数の表示（秘密情報以外）
      - name: 環境情報の表示
        run: |
          echo "環境: ${{ env.CF_ENVIRONMENT }}"
          echo "デプロイ時刻: ${{ env.DEPLOYMENT_TIME }}"
          echo "アプリURL: ${{ vars.NEXT_PUBLIC_APP_URL }}"

      # シークレットの使用（値は表示されない）
      - name: Cloudflareデプロイ
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: pages deploy ./out --project-name=automationa-tools --env=${{ env.CF_ENVIRONMENT }}
```

#### 2.6 環境変数の優先順位

GitHub Actionsでの環境変数の優先順位は以下の通りです：

1. ワークフロー内で`GITHUB_ENV`を使って設定した変数
2. 環境シークレット・環境変数（environment secrets/variables）
3. リポジトリシークレット・リポジトリ変数（repository secrets/variables）
4. デフォルト環境変数（`GITHUB_*`など）

環境固有の設定を使用する場合は、必ず`environment:`キーをジョブに追加して、適切な環境を指定してください。

### 3. Cloudflareの環境変数

Cloudflare Workers/Pagesの設定ページで環境変数を設定：

1. Cloudflareダッシュボード > Workers & Pages > プロジェクト選択
2. Settings > Environment Variables
3. "Add variable"をクリック
4. 変数名と値を入力
5. 環境を選択（プレビュー/本番）

**重要**: APIキーやシークレットは「暗号化」オプションを有効にすること

主要な環境変数：

```
# 基本設定
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_API_BASE_URL
ENVIRONMENT
DEBUG

# 認証設定
AUTH_SECRET
JWT_SECRET
NEXTAUTH_SECRET
NEXTAUTH_URL

# データベース、KV、R2設定
D1_DATABASE_ID
D1_DATABASE_NAME
D1_DATABASE_BINDING
KV_SESSION_STORE_ID
KV_SESSION_STORE_BINDING
KV_CACHE_ID
KV_CACHE_BINDING
R2_ASSETS_BUCKET_NAME
R2_ASSETS_BINDING
R2_BACKUPS_BUCKET_NAME
R2_BACKUPS_BINDING

# AI関連設定
DEFAULT_LLM_PROVIDER
DEFAULT_LLM_MODEL
OPENAI_API_KEY
```

## デプロイワークフロー

### 1. CIワークフロー設定

`.github/workflows/ci.yml`を作成：

```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
    paths-ignore:
      - '**.md'
      - 'docs/**'
  pull_request:
    branches: [main, develop]
    paths-ignore:
      - '**.md'
      - 'docs/**'
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: 型チェック・リント
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm ci
      - run: pnpm run lint

  test:
    name: テスト
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm ci
      - run: pnpm test

  build:
    name: ビルド検証
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm ci
      - run: pnpm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: out/

  deploy-dev:
    name: 開発環境デプロイ
    needs: [build]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: preview # GitHub Environments名を修正

    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: out/
      - name: Cloudflareデプロイ
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: pages deploy ./out --project-name=automationa-tools --env=preview

  deploy-prod:
    name: 本番環境デプロイ
    needs: [build]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production # GitHub Environments名

    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: out/
      - name: Cloudflareデプロイ
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: pages deploy ./out --project-name=automationa-tools --env=production
```

### 2. データベースマイグレーションワークフロー

`.github/workflows/db-migration.yml`を作成：

```yaml
name: データベースマイグレーション

on:
  push:
    branches: [main, develop]
    paths:
      - 'src/infrastructure/database/migrations/**/*.js'
      - 'src/infrastructure/database/schema/**/*.js'
  workflow_dispatch:

jobs:
  db-migration-development:
    name: 開発環境DB移行
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: preview # GitHub Environments名を修正

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm ci
      - name: マイグレーション実行
        env:
          CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CF_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
        run: npx wrangler d1 migrations apply automationa-tools-dev-db --env=preview

  db-migration-production:
    name: 本番環境DB移行
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm ci
      - name: マイグレーション実行
        env:
          CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CF_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
        run: npx wrangler d1 migrations apply automationa-tools-db --env=production
```

### 3. 環境プロモーションワークフロー

`.github/workflows/promote-to-production.yml`を作成：

```yaml
name: 開発から本番へのプロモーション

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'リリースバージョン（例: 1.0.0）'
        required: true
        type: string
      description:
        description: 'リリース内容の簡単な説明'
        required: true
        type: string

jobs:
  create-release-branch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: develop
          fetch-depth: 0

      - name: リリースブランチ作成
        run: |
          git checkout -b release/v${{ github.event.inputs.version }}
          git push -u origin release/v${{ github.event.inputs.version }}

      - name: PRを作成
        uses: repo-sync/pull-request@v2
        with:
          source_branch: 'release/v${{ github.event.inputs.version }}'
          destination_branch: 'main'
          pr_title: 'Release v${{ github.event.inputs.version }} to production'
          pr_body: '${{ github.event.inputs.description }}'
          github_token: ${{ secrets.GITHUB_TOKEN }}

  update-changelog:
    runs-on: ubuntu-latest
    needs: [create-release-branch]
    if: success()
    steps:
      - uses: actions/checkout@v4
        with:
          ref: release/v${{ github.event.inputs.version }}

      - name: CHANGELOGを更新
        run: |
          echo "## v${{ github.event.inputs.version }} - $(date +'%Y-%m-%d')" >> CHANGELOG.md.new
          echo "" >> CHANGELOG.md.new
          echo "${{ github.event.inputs.description }}" >> CHANGELOG.md.new
          echo "" >> CHANGELOG.md.new
          cat CHANGELOG.md >> CHANGELOG.md.new
          mv CHANGELOG.md.new CHANGELOG.md

      - name: コミットしてプッシュ
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add CHANGELOG.md
          git commit -m "docs: CHANGELOGをv${{ github.event.inputs.version }}に更新"
          git push
```

## トラブルシューティング

### Cloudflareデプロイエラー

#### 1. APIトークンの権限不足

**症状**: `Error: You do not have permission to edit...`

**解決策**:

- APIトークンに必要な権限が付与されていることを確認
- Workers & Pages > Edit権限
- Account > Cloudflare Pages > Edit権限
- Zone > DNS > Edit権限（カスタムドメイン使用時）

#### 2. アカウントIDの誤り

**症状**: `Error: Could not find account with ID...`

**解決策**:

- Cloudflareダッシュボードの右下にあるアカウントIDを確認
- シークレット値として正しく設定されているか確認

#### 3. プロジェクト名の不一致

**症状**: `Error: Could not find project with name...`

**解決策**:

```bash
# プロジェクト名の確認
wrangler pages project list

# 正しいプロジェクト名を使用してデプロイ
wrangler pages deploy ./out --project-name="automationa-tools" --env=preview
```

### 環境変数の問題

#### 1. 環境変数が読み取れない

**症状**: 特定の環境変数が`undefined`になる

**解決策**:

- 環境名とシークレット名の大文字小文字を含めた正確な一致を確認
- GitHub Actionsのログで環境変数が正しく設定されているか確認
- リスト形式の環境変数は文字列にシリアライズされる

```yaml
# 誤った設定
SECRET_ARRAY: ["value1", "value2"]

# 正しい設定（JSON文字列）
SECRET_ARRAY: '["value1", "value2"]'
```

#### 2. 秘密情報の露出

**症状**: シークレット値がログに表示される

**解決策**:

- `echo "$PASSWORD"`などのログ出力を避ける
- 必要な場合は `echo "::add-mask::$PASSWORD"` を使用
- GitHub Actionsのログ設定で秘密情報をマスク

### ビルドとデプロイの問題

#### 1. 環境設定の不一致

**症状**: デプロイ時に意図した環境（development/production）が選択されない

**解決策**:

- `wrangler.toml`の環境名と`--env`フラグの一致を確認

```toml
[env.preview]  # この名前がコマンドの--envフラグと一致している必要がある
```

#### 2. ビルド成果物のパス誤り

**症状**: ファイルが見つからないエラーでデプロイ失敗

**解決策**:

- `wrangler.toml`の`pages_build_output_dir`パスを確認

```toml
pages_build_output_dir = "out"  # ビルド出力ディレクトリと一致させる
```

- アップロード時のパスも確認

```yaml
- name: Cloudflareデプロイ
  uses: cloudflare/wrangler-action@v3
  with:
    command: pages deploy ./out # このパスがビルド出力と一致していることを確認
```

#### 3. D1マイグレーションエラー

**症状**: `Error: Cannot find D1 database binding...`

**解決策**:

- データベース名が正しいか確認
- `wrangler.toml`の設定が正しいか確認

```toml
[[env.preview.d1_databases]]
binding = "DB"
database_name = "automationa-tools-dev-db"
database_id = "5963fc08-9ad1-40ff-95bd-4a7bf06f2d33"
```

### GitHub Actions問題

#### 1. 環境名のエラー

**症状**: `Value 'preview' is not valid`

**解決策**:

- GitHub Environments設定が完了していることを確認
- 環境名の大文字小文字を含めた正確な一致を確認

```yaml
# 修正方法（GitHubダッシュボードで環境設定後）
environment: preview # 名前は完全一致が必要
```

#### 2. 並行実行問題

**症状**: 同じブランチで複数のワークフローが競合する

**解決策**:

- `concurrency`設定を追加してジョブの重複実行を防止

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true # 進行中のジョブをキャンセル
```

### 環境間の接続問題

#### 1. 正しいサービスバインディング

**症状**: 開発環境から本番環境のサービスにアクセスできない

**解決策**:

- 環境ごとに正しいバインディングを設定

```toml
[env.preview.services]
AUTH_SERVICE = { service = "auth-service-preview", entrypoint = "default" }

[env.production.services]
AUTH_SERVICE = { service = "auth-service-production", entrypoint = "default" }
```

#### 2. 複雑なMatrixジョブでの環境指定

**症状**: Matrix設定で環境を条件判定する際のエラー

**解決策**:

```yaml
# 誤った方法
if: github.ref == matrix.branch

# 修正方法（個別ジョブに分割）
jobs:
  db-migration-development:
    name: 開発環境DB移行
    if: github.ref == 'refs/heads/develop'
    # ...

  db-migration-production:
    name: 本番環境DB移行
    if: github.ref == 'refs/heads/main'
    # ...
```

### モニタリングとデバッグ

#### 1. ログと監視の設定

本番環境と開発環境でログレベルを分ける:

```toml
[env.preview.vars]
LOG_LEVEL = "debug"

[env.production.vars]
LOG_LEVEL = "error"
```

#### 2. エラー追跡

Cloudflare Workers/Pagesでのエラーを追跡するには:

1. Cloudflareダッシュボード > Workers & Pages > プロジェクト選択
2. Logs > Filter by status code > 4XX / 5XX
3. 特定のリクエストのエラー詳細を確認

#### 3. デバッグモードの有効化

開発環境でのトラブルシューティング用:

```bash
# ローカルでデバッグモードで実行
wrangler pages dev --env=preview -- pnpm run dev

# リモートデバッグ（Workers）
wrangler tail --env=preview
```

環境別の問題を迅速に解決するための上記ガイドラインに従って、開発から本番環境へのスムーズな移行を実現してください。
