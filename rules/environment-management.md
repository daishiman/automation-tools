# MVPアプリケーションの環境管理ガイド

このドキュメントでは、開発環境(develop)と本番環境(main)の分離管理について説明します。

## 環境構成

| 項目                 | 開発環境                 | 本番環境                  |
| -------------------- | ------------------------ | ------------------------- |
| **ブランチ**         | develop                  | main                      |
| **URL**              | dev.app.yourdomain.com   | app.yourdomain.com        |
| **データベース**     | automationa-tools-dev-db | automationa-tools-prod-db |
| **KVネームスペース** | develop_kv_id            | production_kv_id          |
| **R2バケット**       | dev-bucket               | prod-bucket               |
| **ビルド環境変数**   | ENVIRONMENT=development  | ENVIRONMENT=production    |
| **デプロイ承認**     | 不要                     | 必要（レビュアー承認）    |

## ブランチ戦略

![ブランチ戦略](/docs/images/branch-strategy.png)

### ブランチの役割

- **feature/\*** - 機能開発用ブランチ
- **bugfix/\*** - バグ修正用ブランチ
- **develop** - 開発環境用ブランチ（自動デプロイ）
- **release/v\*** - リリース準備用ブランチ
- **main** - 本番環境用ブランチ（レビュー承認後デプロイ）

### 開発フロー

1. **機能開発**

   - developブランチから`feature/xxx`ブランチを作成
   - 開発完了後、developブランチへPRを作成
   - CI/CDでテスト・ビルド検証
   - レビューと承認（1名以上）
   - developブランチへマージ → 開発環境へ自動デプロイ

2. **バグ修正**

   - 問題のあるブランチから`bugfix/xxx`ブランチを作成
   - 修正完了後、対象ブランチへPRを作成
   - CI/CDでテスト・ビルド検証
   - レビューと承認
   - 対象ブランチへマージ → 対応環境へ自動デプロイ

3. **リリース**
   - ワークフローから「開発から本番へのプロモーション」を実行
   - バージョン番号とリリース内容を入力
   - リリースブランチとPRが自動作成される
   - 本番リリース前の最終検証
   - レビューと承認（2名以上）
   - mainブランチへマージ → 本番環境へ自動デプロイ

## Cloudflare環境設定

### wrangler.toml

Cloudflareの環境設定は`wrangler.toml`で管理します：

```toml
# 共通設定
[vars]
APP_NAME = "Automationa Tools"

# 本番環境設定
[env.production]
workers_dev = false
route = "app.yourdomain.com/*"

[env.production.vars]
ENVIRONMENT = "production"

# 開発環境設定
[env.development]
workers_dev = true
route = "dev.app.yourdomain.com/*"

[env.development.vars]
ENVIRONMENT = "development"
DEBUG = "true"
```

### 環境変数

機密情報（APIキーなど）はCloudflareのダッシュボードで環境ごとに設定します：

1. Cloudflareダッシュボード → Workers & Pages → プロジェクト選択
2. Settings → Environment Variables
3. 環境（本番/開発）ごとに値を設定

## GitHub環境設定

### GitHub Environments

GitHub Repositoryの設定で以下の環境を構成します：

1. **production**

   - Protected branch: main
   - Required reviewers: username1, username2
   - Wait timer: 30秒

2. **development**
   - Custom branch policy: develop
   - Required reviewers: なし
   - Wait timer: なし

### 環境シークレット

GitHub Repository Settings → Secrets → Environment secretsで以下を設定：

#### production環境

- `CF_API_TOKEN`: 本番環境用Cloudflareトークン
- `CF_ACCOUNT_ID`: Cloudflareアカウント

#### development環境

- `CF_API_TOKEN`: 開発環境用Cloudflareトークン
- `CF_ACCOUNT_ID`: Cloudflareアカウント

## 自動化ワークフロー

### デプロイ

- **development**: developブランチへの変更時に自動デプロイ
- **production**: mainブランチへの変更時に自動デプロイ（承認必要）

### バックアップ

- 毎日自動バックアップ（環境ごと）
- R2バケットに30日間保持
- 手動バックアップも可能

### データベースマイグレーション

- マイグレーションファイル変更時に自動実行
- 環境ごとのデータベースに適用
- PRではプレビューのみ実行

### ドキュメント生成

- 週次で環境ごとのドキュメント自動生成
- API仕様書、環境情報、コミット履歴の自動記録

## リリースプロセス

### 1. リリース準備

- developブランチの変更を確認
- テスト環境でテスト完了
- GitHub Actionsから「開発から本番へのプロモーション」を実行
- バージョン番号とリリース内容を入力

### 2. リリース検証

- リリースPRが自動作成される
- CI/CDでテスト・ビルド検証
- リリースノートを確認
- 変更内容を最終確認

### 3. リリース実行

- リリースPRのレビューと承認（2名以上）
- mainブランチへマージ
- 本番環境へ自動デプロイ
- デプロイ後のスモークテスト自動実行
- GitHubリリースとタグが自動作成される

### 4. リリース後確認

- 本番環境の動作確認
- リリースメモの更新
- メトリクスの監視

## バックアップと復元

### バックアップ実行

```bash
# 手動バックアップ実行
gh workflow run backups.yml -f environment=production

# バックアップ一覧確認
wrangler r2 object list prod-backup-bucket/production/ --env=production
```

### 復元手順

```bash
# R2からバックアップファイルをダウンロード
wrangler r2 object get prod-backup-bucket/production/2023-12/db-20231225_120000.sql --file=backup.sql --env=production

# D1データベースに復元
wrangler d1 restore automationa-tools-prod-db --file=backup.sql --env=production
```

## トラブルシューティング

### デプロイ失敗時

1. GitHub Actionsのログを確認
2. 特定のエラーが見つからない場合はCloudflareダッシュボードで詳細ログを確認
3. 必要に応じて前バージョンにロールバック

### ロールバック方法

```bash
# 特定のタグに戻す
git checkout v1.2.3
git checkout -b rollback/to-v1.2.3
git push origin rollback/to-v1.2.3
# PRを作成してデプロイ
```

### データベース問題

1. バックアップが利用可能か確認
2. 最新の安定バックアップを特定
3. 復元手順に従ってバックアップから復元

## まとめ

この環境管理戦略により、開発と本番の分離、安全なデプロイフロー、データバックアップ、適切な権限管理が実現されています。各環境は独立しており、本番環境への変更は常に検証とレビューを経て行われます。
