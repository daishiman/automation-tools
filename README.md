# automationa-tools-application

変更容易性と拡張性を重視したMVPアーキテクチャに基づくアプリケーション

## 技術スタック

- **言語/フレームワーク**: TypeScript 5.3+, Next.js 14+
- **インフラ**: Cloudflare Pages, Workers, D1, KV, R2
- **UIライブラリ**: React 18+, TailwindCSS 3.3+, shadcn/ui
- **状態管理**: Zustand 4.4+, TanStack Query 5.8+
- **データベース**: Drizzle ORM 0.29+
- **APIフレームワーク**: Hono 4.7+
- **AIフレームワーク**: Mastra

## 開発環境セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/your-organization/automationa-tools-application.git
cd automationa-tools-application

# 依存関係のインストール
pnpm install

# 環境変数の設定
cp .env.sample .env.local
# .env.localを編集して必要な値を設定

# 開発サーバーの起動
pnpm dev
```

## 開発フロー

1. 新しいブランチを作成（`feature/機能名` または `fix/問題名`）
2. 変更を実装
3. テストの実行（`pnpm test`）
4. プルリクエストを作成
5. コードレビュー後にマージ

## ディレクトリ構成

主要ディレクトリの説明:

- `src/app`: Next.jsアプリケーションルート（App Router）
- `src/domain`: ドメインモデルとビジネスロジック
- `src/infrastructure`: インフラストラクチャ層（DB、認証など）
- `src/mastra`: AIエージェント・ワークフロー
- `src/components`: UIコンポーネント
- `src/lib`: ユーティリティと共通機能

## Cloudflareデプロイとリソース管理

このプロジェクトはCloudflare Pagesを使用してデプロイされ、様々なCloudflareリソース（D1、KV、R2）を環境ごとに分離して利用します。

### 環境の構成

アプリケーションは3つの環境で動作します：

| 環境             | ブランチ | 用途               | データベース               | KVネームスペース       | R2バケット                      |
| ---------------- | -------- | ------------------ | -------------------------- | ---------------------- | ------------------------------- |
| **本番環境**     | main     | エンドユーザー向け | automationa-tools-prod-db  | production_cache_kv_id | prod-automationa-tools-storage  |
| **開発環境**     | develop  | テスト環境         | automationa-tools-dev-db   | develop_session_kv_id  | dev-automationa-tools-storage   |
| **ローカル環境** | -        | ローカル開発       | automationa-tools-local-db | local_cache_kv_id      | local-automationa-tools-storage |

各環境はそれぞれ独立したリソースを持ち、データの混在を防ぎます。

### デプロイ方法

環境ごとのデプロイコマンド：

```bash
# 開発環境へのデプロイ（developブランチ）
pnpm cf:deploy:dev

# 本番環境へのデプロイ（mainブランチ）
pnpm cf:deploy:prod
```

これらのコマンドは以下の処理を自動的に行います：

1. Next.jsアプリケーションをビルド（静的エクスポート）
2. 適切なブランチとして環境を指定してCloudflare Pagesにデプロイ
3. 環境に応じた設定（`.env.development`または`.env.production`）を適用

### Cloudflareリソース操作

#### 環境別D1データベース操作

各環境のD1データベースを操作するコマンド：

```bash
# ローカル環境
pnpm db:local:execute "SELECT * FROM users"  # SQLクエリ実行
pnpm db:local:migrate                         # マイグレーション実行
pnpm cf:db:local                              # インタラクティブシェル

# 開発環境
pnpm db:dev:execute "SELECT * FROM users"     # SQLクエリ実行
pnpm db:dev:migrate                           # マイグレーション実行
pnpm cf:db:dev                                # インタラクティブシェル

# 本番環境
pnpm db:prod:execute "SELECT * FROM users"    # SQLクエリ実行
pnpm db:prod:migrate                          # マイグレーション実行
pnpm cf:db:prod                               # インタラクティブシェル
```

#### 環境別KVストア操作

各環境のKVネームスペースを操作するコマンド：

```bash
# ローカル環境
pnpm kv:local:put "test-key" "test-value"     # 値を設定
pnpm kv:local:get "test-key"                  # 値を取得
pnpm kv:local:list                            # キー一覧

# 開発環境
pnpm kv:dev:put "test-key" "test-value"       # 値を設定
pnpm kv:dev:get "test-key"                    # 値を取得
pnpm kv:dev:list                              # キー一覧

# 本番環境
pnpm kv:prod:put "test-key" "test-value"      # 値を設定
pnpm kv:prod:get "test-key"                    # 値を取得
pnpm kv:prod:list                              # キー一覧
```

#### 環境別R2ストレージ操作

各環境のR2バケットを操作するコマンド：

```bash
# ローカル環境
pnpm r2:local:upload path/file.txt            # ファイルアップロード
pnpm r2:local:download path/file.txt          # ファイルダウンロード
pnpm r2:local:list                            # オブジェクト一覧

# 開発環境
pnpm r2:dev:upload path/file.txt              # ファイルアップロード
pnpm r2:dev:download path/file.txt            # ファイルダウンロード
pnpm r2:dev:list                              # オブジェクト一覧

# 本番環境
pnpm r2:prod:upload path/file.txt             # ファイルアップロード
pnpm r2:prod:download path/file.txt           # ファイルダウンロード
pnpm r2:prod:list                             # オブジェクト一覧
```

### リソース作成コマンド（共通）

新しいCloudflareリソースを作成するためのコマンド：

```bash
# D1データベース作成
pnpm db:create-d1

# KVネームスペース作成
pnpm kv:create-namespace

# R2バケット作成
pnpm r2:create-bucket
```

**注意**: 新しいリソースを作成した後は、生成されたIDを`wrangler.toml`に追加する必要があります。

### ログ確認

Cloudflareのログを確認するコマンド：

```bash
# 開発環境のログ
pnpm cf:tail:dev

# 本番環境のログ
pnpm cf:tail:prod
```

## 既知の問題と対処法

### Next.js設定の警告

```
⚠ Invalid next.config.js options detected:
⚠     Expected object, received boolean at "experimental.serverActions"
⚠ See more info here: https://nextjs.org/docs/messages/invalid-next-config
⚠ Server Actions are available by default now, `experimental.serverActions` option can be safely removed.
```

**修正方法**: `next.config.js`を編集し、`experimental.serverActions`の設定を削除してください。Server Actionsは現在のNext.jsでデフォルトで利用可能です。

```js
// 修正前
experimental: {
  serverActions: true,
},

// 修正後
experimental: {
  // serverActionsは削除
},
```

## ドキュメント

詳細なドキュメントは `rules/` ディレクトリに保存されています：

- `overall_rule.md` - アーキテクチャ全体の設計ガイド
- `initial_setup_guide.md` - 初期設定ガイド
- `db_infra_setup_guide.md` - DB・インフラ設定ガイド
- `docs/cloudflare-github-environment-setup.md` - Cloudflare・GitHub環境分離設定ガイド

## サポート

問題が発生した場合は、以下の方法でサポートを受けることができます：

- [GitHub Issues](https://github.com/your-organization/automationa-tools-application/issues)
- [チームのSlackチャンネル](#) - #automationa-tools-application-support

## ライセンス

MIT License

## 開発ワークフロー

### Git Hooks

このプロジェクトではHuskyを使用してGit Hooksを設定しています。これにより、Gitコマンド実行時に自動的にテストが実行されます。

#### インストール方法

新しく開発環境をセットアップする場合は、以下のコマンドを実行してください：

```bash
pnpm install
```

`prepare`スクリプトにより、Huskyのフックが自動的に設定されます。

#### 設定されているフック

| フック名   | 実行タイミング           | 実行される処理                                                      |
| ---------- | ------------------------ | ------------------------------------------------------------------- |
| pre-commit | コミット前               | `pnpm git:commit-test` - 型チェックとユニットテストを実行           |
| commit-msg | コミットメッセージ入力時 | コミットメッセージの形式を検証（Conventional Commits形式）          |
| pre-push   | プッシュ前               | `pnpm git:push-test` - 型チェック、ユニットテスト、統合テストを実行 |
| post-merge | マージ後                 | 依存関係の変更があれば`pnpm install`を実行し、すべてのテストを実行  |

#### コミットメッセージの形式

コミットメッセージは以下の形式に従ってください：

```
<type>[(scope)]: <description>

[body]

[footer]
```

有効な`type`の一覧：

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントの変更
- `style`: 書式の変更（コードの動作に影響しないスペース、フォーマット、セミコロンなど）
- `refactor`: リファクタリング（バグ修正でも機能追加でもないコード変更）
- `perf`: パフォーマンス向上のための変更
- `test`: テストの追加・修正
- `chore`: ビルドプロセスやツール、ライブラリの変更
- `build`: ビルドシステムや外部依存関係に関する変更
- `ci`: CI設定ファイルやスクリプトの変更
- `revert`: 以前のコミットを取り消す変更

例：

```
feat: ユーザー認証機能の追加
fix(auth): リフレッシュトークンの有効期限バグを修正
docs: APIドキュメントを更新
```

#### Git操作時のテスト実行

Gitコマンド実行時に自動的にテストが実行されるよう設定されています：

| Git操作  | テスト内容                       | 実行方法                                          |
| -------- | -------------------------------- | ------------------------------------------------- |
| add前    | 変更ファイル関連テスト           | `git add-with-test <files>` または `pnpm git:add` |
| commit前 | 型チェック＋ユニットテスト       | 自動実行（pre-commitフック）                      |
| push前   | 型チェック＋ユニット＋統合テスト | 自動実行（pre-pushフック）                        |

##### git add前のテスト実行方法

標準の`git add`コマンドの代わりに以下のいずれかの方法を使用できます：

```bash
# 方法1: Gitエイリアスを使用（セットアップ後）
git add-with-test <files>  # 例: git add-with-test src/components/Button.tsx

# 方法2: ラッパースクリプトを使用（セットアップ後）
scripts/git-wrapper.js add <files>  # 例: scripts/git-wrapper.js add .

# 方法3: pnpmコマンドを使用（すべての変更が対象）
pnpm git:add
```

##### セットアップ方法

標準の`git add`コマンドをラップしてテストを実行するには、以下のコマンドを実行してください：

```bash
# Gitエイリアスとラッパースクリプトをセットアップ
pnpm git:setup-wrapper
```

このセットアップにより、`git add-with-test`コマンドが使用可能になります。
