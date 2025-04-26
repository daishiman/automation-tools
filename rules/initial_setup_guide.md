# 初期設定ガイド (v1.0.0)

このドキュメントでは、プロジェクトの初期設定手順を詳細に説明します。変更容易性と拡張性を重視したMVPアーキテクチャに基づく開発環境の構築方法を網羅しています。すべてのエンジニアが同一環境で開発できるよう、具体的かつ再現可能な手順を提供します。

> **注意**: 本ガイドは2023年12月時点の情報に基づいて作成されています。

## 目次

1. [開発環境の準備](#1-開発環境の準備)
2. [リポジトリのセットアップ](#2-リポジトリのセットアップ)
3. [プロジェクト初期化](#3-プロジェクト初期化)
4. [Cloudflare設定](#4-cloudflare設定)
5. [依存関係のインストール](#5-依存関係のインストール)
6. [基本設定ファイルの構成](#6-基本設定ファイルの構成)
7. [ディレクトリ構造の作成](#7-ディレクトリ構造の作成)
8. [CI/CD設定](#8-cicd設定)
9. [初期コミット](#9-初期コミット)
10. [開発開始前のチェックリスト](#10-開発開始前のチェックリスト)
11. [トラブルシューティング](#11-トラブルシューティング)

## 1. 開発環境の準備

### Node.js

- **必須バージョン**: Node.js v18.18.0以上（v20.10.0推奨）

  ```bash
  # nvmを使用した場合（推奨）
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
  # ターミナルを再起動後
  nvm install 20.10.0
  nvm use 20.10.0
  node -v  # バージョン確認: v20.10.0と表示されることを確認

  # Windowsの場合:
  # 1. https://github.com/coreybutler/nvm-windows/releases から最新版をダウンロード
  # 2. インストーラーを実行
  # 3. 管理者権限でコマンドプロンプトを開き以下を実行:
  nvm install 20.10.0
  nvm use 20.10.0

  # macOS (Homebrew経由)
  brew install node@20

  # その他の場合は公式サイトからダウンロード
  # https://nodejs.org/
  ```

- **Node.jsインストール確認**
  ```bash
  node -v  # v20.10.0（または v18.18.0以上）
  npm -v   # 10.2.3以上
  ```

### パッケージマネージャー

- **pnpm v8.10.0以上をインストール**

  ```bash
  # npmを使用してグローバルインストール
  npm install -g pnpm@latest

  # インストール確認
  pnpm -v  # 8.10.0以上が表示されることを確認

  # インストールに問題がある場合の代替方法（Windowsの場合）
  iwr https://get.pnpm.io/install.ps1 -useb | iex

  # インストールに問題がある場合の代替方法（Linux/macOSの場合）
  curl -fsSL https://get.pnpm.io/install.sh | sh -
  ```

### エディタとプラグイン

- **Visual Studio Code 最新版をインストール**

  - [VSCode公式サイト](https://code.visualstudio.com/)からダウンロード
  - バージョン: 1.84.0以上を推奨

- **必須拡張機能**:

  ```bash
  # 以下のコマンドをターミナルで実行して一括インストール
  code --install-extension dbaeumer.vscode-eslint
  code --install-extension esbenp.prettier-vscode
  code --install-extension bradlc.vscode-tailwindcss
  code --install-extension eamodio.gitlens
  code --install-extension usernamehw.errorlens
  code --install-extension ms-vscode.vscode-typescript-next
  ```

  または手動で以下をインストール:

  - ESLint (`dbaeumer.vscode-eslint`)
  - Prettier (`esbenp.prettier-vscode`)
  - Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)
  - GitLens (`eamodio.gitlens`)
  - Error Lens (`usernamehw.errorlens`)
  - TypeScript + JavaScript (`ms-vscode.vscode-typescript-next`)

- **VSCode設定ファイル**

  プロジェクトルートに`.vscode/settings.json`を作成:

  ```bash
  mkdir -p .vscode
  cat > .vscode/settings.json << 'EOL'
  {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true
    },
    "typescript.tsdk": "node_modules/typescript/lib",
    "typescript.enablePromptUseWorkspaceTsdk": true,
    "tailwindCSS.includeLanguages": {
      "typescript": "javascript",
      "typescriptreact": "javascript"
    }
  }
  EOL
  ```

### Git設定

- **Git 2.40.0以上をインストール**

  ```bash
  # バージョン確認
  git --version  # git version 2.40.0以上

  # Windowsの場合
  # https://git-scm.com/download/win からインストーラーをダウンロード

  # macOSの場合
  brew install git

  # Ubuntuの場合
  sudo apt update
  sudo apt install git
  ```

- **Gitの基本設定**

  ```bash
  git config --global user.name "あなたの名前"
  git config --global user.email "あなたのメールアドレス"

  # 改行コードの設定（Windows環境の場合）
  git config --global core.autocrlf true

  # 改行コードの設定（macOS/Linux環境の場合）
  git config --global core.autocrlf input

  # 設定確認
  git config --list
  ```

## 2. リポジトリのセットアップ

### GitHubリポジトリの作成

1. [GitHub](https://github.com/)にログイン
2. 右上の`+`ボタン > `New repository`をクリック
3. 以下の情報を入力:
   - Repository name: プロジェクト名（例: `automationa-tools-application`）
   - Description: プロジェクト説明
   - Visibility: Public または Private
   - Initialize this repository with: README にチェック
   - Add .gitignore: Node を選択
   - Choose a license: 適切なライセンスを選択（例: MIT License）
4. `Create repository`をクリック

### リポジトリのクローン

```bash
# リポジトリをクローン（URLはGitHubの「Code」ボタンからコピー）
git clone https://github.com/ユーザー名/リポジトリ名.git
cd リポジトリ名

# クローン後のリポジトリ内容確認
ls -la
# 出力例：
# total 24
# drwxr-xr-x  4 user  group   128 Dec  1 12:00 .
# drwxr-xr-x  3 user  group    96 Dec  1 12:00 ..
# drwxr-xr-x 12 user  group   384 Dec  1 12:00 .git
# -rw-r--r--  1 user  group  1080 Dec  1 12:00 .gitignore
# -rw-r--r--  1 user  group  1065 Dec  1 12:00 LICENSE
# -rw-r--r--  1 user  group   127 Dec  1 12:00 README.md
```

### ブランチ保護ルールの設定

1. GitHubのリポジトリページに移動
2. `Settings` > `Branches` > `Branch protection rules` > `Add rule`をクリック
3. 以下の設定を適用:
   - Branch name pattern: `main`
   - 以下にチェック:
     - [x] Require a pull request before merging
     - [x] Require approvals (1名以上を設定)
     - [x] Require status checks to pass before merging
     - [x] Require branches to be up to date before merging
     - [x] Include administrators
   - `Create`または`Save changes`をクリック

> 注意: ブランチ保護ルールはGitHubの無料プランでもパブリックリポジトリで使用できますが、プライベートリポジトリでは有料プラン（Team以上）が必要です。

### .gitignoreの更新

既存の.gitignoreファイルに追加する内容:

```bash
# 既存の.gitignoreファイルを確認
cat .gitignore

# 必要な項目を追加
cat >> .gitignore << 'EOL'

# Next.js特有
.next/
out/

# 環境変数
.env
.env.*
!.env.example

# デバッグ
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# ローカル環境ファイル
.env*.local

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Cloudflare
.wrangler/
.dev.vars
EOL

# 変更の確認
cat .gitignore
```

## 3. プロジェクト初期化

### Docker開発環境の構築

開発環境の差異を減らし、一貫した開発・テスト環境を確保するためにDockerを活用します。

```bash
# Dockerファイルの作成
cat > Dockerfile << 'EOL'
FROM node:20.10.0-slim

WORKDIR /app

# 必要なツールのインストール
RUN apt-get update && apt-get install -y git curl

# pnpm のインストール
RUN npm install -g pnpm@8.10.0

# wrangler のインストール
RUN npm install -g wrangler@3.15.0

# Node.jsアプリケーションの依存関係を扱うための設定
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# アプリケーションのソースコードをコピー
COPY . .

# アプリケーションを起動
CMD ["pnpm", "dev"]
EOL

# Docker Composeファイルの作成
cat > docker-compose.yml << 'EOL'
version: '3.8'

services:
  app:
    build: .
    container_name: automationa-tools-app
    volumes:
      - .:/app
      - node_modules:/app/node_modules
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    command: pnpm dev

volumes:
  node_modules:
EOL

# Docker Ignoreファイルの作成
cat > .dockerignore << 'EOL'
node_modules
.next
out
.git
.github
coverage
.env*
!.env.example
README.md
EOL
```

## 4. Cloudflare設定

### Cloudflareアカウント作成と準備

1. [Cloudflare公式サイト](https://dash.cloudflare.com/sign-up)でアカウントを作成（既存アカウントがある場合はログイン）
2. アカウントダッシュボードからワーカーとページの設定ページにアクセス:
   - 左サイドバーから「Workers & Pages」を選択
   - 「Pages」タブを選択し、「Create application」をクリック
3. 「Connect to Git」を選択し、GitHubアカウントと連携

> **注意**: Cloudflareの無料枠には以下の制限があります：
>
> - Pages: 無制限サイト、月間500ビルド、月間100GBネットワーク転送
> - Workers: 月間10万リクエスト、CPU時間制限あり
> - D1: 5GB保存、月間500万クエリ
> - KV: 1GB保存、日10万読取/1000書込
> - R2: 10GB保存/月、数百万リクエスト/月

### Cloudflare開発ツールのインストール

```bash
# Wrangler CLI（Cloudflareの開発ツール）のインストール
pnpm add -g wrangler@3.15.0

# インストール確認
wrangler --version
# 出力例: 3.15.0

# Cloudflareアカウントへのログイン
wrangler login
# ブラウザが開き、認証を求められます。認証を完了させてください。
# 認証成功メッセージ: "You have successfully logged in."
```

### D1データベースの作成

```bash
# D1データベースの作成
wrangler d1 create automationa-tools-db
# 出力例:
# Created database 'automationa-tools-db' (xxxx-xxxx-xxxx-xxxx-xxxx)
# [[d1_databases]]
# binding = "DB"
# database_name = "automationa-tools-db"
# database_id = "xxxx-xxxx-xxxx-xxxx-xxxx"

# データベースIDを保存しておく
# database_id=xxxx-xxxx-xxxx-xxxx-xxxx
```

### KVネームスペースの作成

```bash
# KVネームスペースの作成
wrangler kv:namespace create automationa-tools-cache
# 出力例:
# Add the following to your configuration file:
# [[kv_namespaces]]
# binding = "automationa-tools-cache"
# id = "xxxx-xxxx-xxxx-xxxx-xxxx"

# KV IDを保存しておく
# kv_id=xxxx-xxxx-xxxx-xxxx-xxxx
```

### R2バケットの作成

```bash
# R2バケットの作成
wrangler r2 bucket create automationa-tools-storage
# 出力例:
# Created bucket 'automationa-tools-storage'
# Add the following to your wrangler.toml file:
# [[r2_buckets]]
# binding = "STORAGE"
# bucket_name = "automationa-tools-storage"
```

### wrangler.tomlの設定

```bash
# wrangler.tomlファイルの作成
cat > wrangler.toml << EOL
name = "automationa-tools-application"
compatibility_date = "2023-12-01"
main = "src/worker.ts"

# 先ほど作成したD1データベースの設定
[[d1_databases]]
binding = "DB"
database_name = "automationa-tools-db"
database_id = "$(上記で保存したdatabase_id)"

# 先ほど作成したKVネームスペースの設定
[[kv_namespaces]]
binding = "KV_CACHE"
id = "$(上記で保存したkv_id)"

# 先ほど作成したR2バケットの設定
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "automationa-tools-storage"

# 環境変数設定
[vars]
ENVIRONMENT = "production"

# 開発環境向け
[env.development]
workers_dev = true
[env.development.vars]
ENVIRONMENT = "development"

# ステージング環境向け
[env.staging]
[env.staging.vars]
ENVIRONMENT = "staging"

# Pages設定
[site]
bucket = "./out"
EOL

# 設定ファイルの確認
cat wrangler.toml
```

### Cloudflare設定のテスト

```bash
# D1接続テスト
wrangler d1 execute automationa-tools-db --command "SELECT 1+1 as result"
# 出力例: { result: 2 }

# KV動作テスト
wrangler kv:key put --binding=KV_CACHE "test-key" "test-value"
wrangler kv:key get --binding=KV_CACHE "test-key"
# 出力例: test-value
```

## 5. 依存関係のインストール

### core依存関係のインストール

依存関係のインストールを必要なカテゴリに分けて段階的に行います：

```bash
# コア依存関係のインストール（UIフレームワーク・スタイリング）
pnpm add react@18.2.0 react-dom@18.2.0 next@14.0.3
pnpm add tailwindcss@3.3.5 postcss@8.4.31 autoprefixer@10.4.16

# インストール結果の確認
pnpm list react react-dom next
# 出力例:
# ├─ react@18.2.0
# ├─ react-dom@18.2.0
# └─ next@14.0.3

# UI関連依存関係のインストール（shadcn/uiのコア部分）
pnpm add class-variance-authority@0.7.0 clsx@2.0.0 tailwind-merge@1.14.0 lucide-react@0.292.0 tailwindcss-animate@1.0.7

# 状態管理関連ライブラリのインストール
pnpm add zustand@4.4.6 @tanstack/react-query@5.8.4

# フォーム管理ライブラリのインストール
pnpm add react-hook-form@7.48.2 zod@3.22.4 @hookform/resolvers@3.3.2

# データベース関連ライブラリのインストール
pnpm add drizzle-orm@0.29.0 @cloudflare/d1@1.5.1

# 国際化ライブラリのインストール
pnpm add next-intl@3.2.1

# ユーティリティライブラリのインストール
pnpm add date-fns@2.30.0 uuid@9.0.1 @types/uuid@9.0.7
```

### 開発用依存関係のインストール

```bash
# TypeScriptとReact型定義のインストール
pnpm add -D typescript@5.3.2 @types/react@18.2.39 @types/react-dom@18.2.17 @types/node@20.10.0

# lintとフォーマッター関連のインストール
pnpm add -D eslint@8.54.0 eslint-config-next@14.0.3 @typescript-eslint/eslint-plugin@6.12.0 @typescript-eslint/parser@6.12.0
pnpm add -D prettier@3.1.0 eslint-config-prettier@9.0.0

# Drizzle関連の開発ツール
pnpm add -D drizzle-kit@0.20.4

# テスト関連ライブラリのインストール
pnpm add -D vitest@0.34.6 @testing-library/react@14.1.2 @testing-library/jest-dom@6.1.4 @vitejs/plugin-react@4.2.0 jsdom@22.1.0

# E2Eテスト用ライブラリのインストール
pnpm add -D @playwright/test@1.40.0
```

### 依存関係のインストール確認

```bash
# インストールされたパッケージの概要を確認
pnpm list --depth=0

# package.jsonの内容を確認
cat package.json
```

### Tailwind CSS初期設定の更新

```bash
# Tailwind CSS設定ファイルが存在することを確認
ls tailwind.config.js postcss.config.js

# Tailwind CSS設定を拡張
cat > tailwind.config.js << 'EOL'
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
EOL

# CSSの基本変数を設定（src/app/globals.cssを更新）
cat > src/app/globals.css << 'EOL'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;

    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;

    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;

    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;

    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;

    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;

    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;

    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;

    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;

    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
EOL

# Tailwind CSSの設定を確認
cat tailwind.config.js
cat src/app/globals.css
```

## 6. 基本設定ファイルの構成

### 環境変数テンプレートの作成

```bash
# .env.exampleファイルの作成
cat > .env.example << 'EOL'
# アプリケーション
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 認証
AUTH_SECRET=auth_secret_change_me
JWT_SECRET=jwt_secret_change_me

# API
NEXT_PUBLIC_API_BASE_URL=/api

# Cloudflare
CF_ACCOUNT_ID=your_cloudflare_account_id
CF_API_TOKEN=your_cloudflare_api_token

# AI（必要な場合）
OPENAI_API_KEY=your_openai_api_key
EOL

# 開発用の.env.localファイルを作成（実際の値に置き換えること）
cp .env.example .env.local
# エディタで.env.localを編集し、適切な値を設定してください

# 環境変数テンプレートを確認
cat .env.example
```

### Next.js設定のカスタマイズ

```bash
# next.config.jsの更新
cat > next.config.js << 'EOL'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
    ],
  },
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
EOL

# 設定ファイルの確認
cat next.config.js
```

### Drizzle ORM設定

```bash
# drizzle.config.tsファイルの作成
cat > drizzle.config.ts << 'EOL'
import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

export default defineConfig({
  schema: './src/infrastructure/database/drizzle/schema/*.ts',
  out: './drizzle',
  driver: 'd1',
  dbCredentials: {
    wranglerConfigPath: './wrangler.toml',
    dbName: 'DB',
  },
  verbose: true,
  strict: true,
});
EOL

# dotenvパッケージのインストール（.envファイルの読み込みに必要）
pnpm add -D dotenv

# 設定ファイルの確認
cat drizzle.config.ts
```

### Vitest（テストツール）設定

```bash
# vitest.config.tsファイルの作成
cat > vitest.config.ts << 'EOL'
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
EOL

# テスト設定ディレクトリとファイルの作成
mkdir -p tests
cat > tests/setup.ts << 'EOL'
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// テスト後のクリーンアップ
afterEach(() => {
  cleanup();
});
EOL

# テスト設定ファイルの確認
cat vitest.config.ts
cat tests/setup.ts
```

### Playwright（E2Eテスト）設定

```bash
# Playwrightの初期設定（対話的設定）
pnpm exec playwright install --with-deps
pnpm exec playwright install chromium
pnpm exec playwright config

# Playwright設定ファイルを確認（生成された場合）
cat playwright.config.ts
```

## 7. ディレクトリ構造の作成

### 基本ディレクトリ構造の作成

```bash
# 基本ディレクトリ構造の作成（一括でディレクトリを作成）
mkdir -p \
  src/app/api \
  src/app/webhooks \
  src/app/"(routes)"/"(auth)" \
  src/app/"(routes)"/"(dashboard)" \
  src/app/"(routes)"/"(marketing)" \
  src/domain/shared \
  src/infrastructure/database/drizzle/schema \
  src/infrastructure/database/drizzle/migrations \
  src/infrastructure/database/repositories \
  src/infrastructure/database/queryBuilders \
  src/infrastructure/auth \
  src/infrastructure/storage \
  src/mastra/agents \
  src/mastra/workflows \
  src/mastra/tools \
  src/mastra/rag/data_sources \
  src/mastra/rag/embeddings \
  src/mastra/evals \
  src/mastra/shared \
  src/mastra/integrations \
  src/mastra/syncs \
  src/mastra/observability \
  src/mastra/memory \
  src/components/ui \
  src/components/layout \
  src/components/shared \
  src/hooks \
  src/lib/utils \
  src/lib/api \
  src/lib/auth \
  src/lib/di \
  src/lib/errors \
  src/lib/config \
  src/stores \
  src/types \
  tests/unit \
  tests/integration \
  tests/e2e \
  public/images

# ディレクトリ構造の確認
find src -type d -print | sort
```

### 基本ファイルの作成

````bash
# エラーハンドリング基本クラス
cat > src/lib/errors/app-error.ts << 'EOL'
export class AppError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(code: string, message: string, details?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(code: string, message: string, details?: Record<string, any>) {
    super(code, message, details);
  }
}

export class AuthError extends AppError {
  constructor(code: string, message: string, details?: Record<string, any>) {
    super(code, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string, details?: Record<string, any>) {
    super(code, message, details);
  }
}

export class ServiceError extends AppError {
  constructor(code: string, message: string, details?: Record<string, any>) {
    super(code, message, details);
  }
}
EOL

# APIエラーハンドラー
cat > src/lib/api/error-handler.ts << 'EOL'
import { NextResponse } from 'next/server';
import { AppError, ValidationError, AuthError, NotFoundError, ServiceError } from '../errors/app-error';

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: 400 }
    );
  }

  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: 401 }
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: 404 }
    );
  }

  if (error instanceof ServiceError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: 500 }
    );
  }

  // 未知のエラー
  return NextResponse.json(
    { error: { code: 'INTERNAL_SERVER_ERROR', message: 'サーバーエラーが発生しました' } },
    { status: 500 }
  );
}
EOL

# データベースクライアント
cat > src/infrastructure/database/drizzle/client.ts << 'EOL'
import { drizzle } from 'drizzle-orm/d1';
import { D1Database } from '@cloudflare/workers-types';

let db: ReturnType<typeof drizzle> | null = null;

export function getDbClient(d1: D1Database) {
  if (!db) {
    db = drizzle(d1);
  }
  return db;
}
EOL

# ユーティリティ関数
cat > src/lib/utils/index.ts << 'EOL'
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * クラス名を結合するユーティリティ関数
 * clsxとtailwind-mergeを組み合わせて使用
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 日付をフォーマットするユーティリティ関数
 * @param date フォーマットする日付
 * @param format フォーマット（省略時はYYYY-MM-DD）
 */
export function formatDate(date: Date, format = 'YYYY-MM-DD') {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day);
}
EOL

# アプリケーションレイアウト
cat > src/app/layout.tsx << 'EOL'
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MVPアプリケーション',
  description: '変更容易性と拡張性を重視したMVPアプリケーション',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
EOL

# ホームページ
cat > src/app/page.tsx << 'EOL'
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-6">MVPアプリケーション</h1>
      <p className="text-xl mb-10">変更容易性と拡張性を重視したアーキテクチャ</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-3">変更容易性</h2>
          <p>ドメインロジックを独立させ、変更の影響範囲を最小化</p>
        </div>
        <div className="p-6 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-3">拡張性</h2>
          <p>段階的スケーリングが可能なCloudflareインフラストラクチャ</p>
        </div>
        <div className="p-6 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-3">AI活用</h2>
          <p>Mastraフレームワークによる柔軟なAIエージェント構築</p>
        </div>
      </div>
      <div className="mt-10">
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          ダッシュボードへ
        </Link>
      </div>
    </main>
  );
}
EOL

# 開発サーバー起動用スクリプト追加
cat > start-dev.sh << 'EOL'
#!/bin/bash
echo "開発サーバーを起動しています..."
pnpm dev
EOL
chmod +x start-dev.sh

# READMEファイルの更新
cat > README.md << 'EOL'
# automationa-tools-application

変更容易性と拡張性を重視したMVPアーキテクチャに基づくアプリケーション

## 機能

- TypeScriptとNext.jsによる安全でモダンな実装
- クリーンアーキテクチャによる高い変更容易性と拡張性
- Cloudflare D1、KV、R2を活用した費用対効果の高いインフラ
- シャドーイングUIコンポーネントによる美しいUX
- マルチレイヤーバリデーションによる堅牢なデータ処理

## 開発環境のセットアップ

### 必要条件

- Node.js v20.10.0以上
- pnpm v8.10.0以上
- wrangler v3.15.0以上

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/your-organization/automationa-tools-application.git
cd automationa-tools-application

# 依存関係のインストール
pnpm install

# 環境変数の設定
cp .env.sample .env.local
# .env.localを編集して必要な設定を行ってください

# 開発サーバーの起動
pnpm dev
````

## 開発ワークフロー

- `main` ブランチが常に最新の安定版
- 新機能は `feature/*` ブランチで開発
- バグ修正は `fix/*` ブランチで対応
- リリースは `release/*` ブランチで準備

## テスト実行

```bash
# ユニットテスト実行
pnpm test

# E2Eテスト実行
pnpm test:e2e
```

## デプロイ

```bash
# 本番環境へのデプロイ
pnpm build
pnpm wrangler pages deploy ./out --project-name=automationa-tools-application
```

## サポート

問題が発生した場合は、以下の方法でサポートを受けることができます：

- [GitHub Issues](https://github.com/your-organization/automationa-tools-application/issues)
- [チームのSlackチャンネル](#) - #automationa-tools-application-support

## ライセンス

MIT
EOL

# .gitignoreの更新

cat >> .gitignore << 'EOL'

# Cloudflare

.wrangler/
.dev.vars

# Node.js

node_modules/

# Next.js

.next/
out/

# 環境変数

.env
.env.\*
!.env.example
!.env.sample
!.env.test
!.env.e2e

# テスト

coverage/
test-results/
playwright-report/

# IDEとエディタ

.vscode/_
!.vscode/settings.json
!.vscode/extensions.json
.idea/
_.swp
\*.swo

# OS固有

.DS_Store
Thumbs.db
EOL

````

## 8. CI/CD設定

### テスト自動化設定

コミットやプッシュのたびにテストを自動的に実行するために、Git Hooksとハスキーを設定します。

```bash
# Husky と lint-staged のインストール
pnpm add -D husky lint-staged

# Husky 初期化
pnpm dlx husky-init
pnpm install  # 再インストールが必要

# pre-commit フックの設定（コミット前にリント・フォーマットを実行）
cat > .husky/pre-commit << 'EOL'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
EOL

# pre-push フックの設定（プッシュ前にテストと型チェックを実行）
cat > .husky/pre-push << 'EOL'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm type-check
pnpm test
EOL

# 実行権限の追加
chmod +x .husky/pre-commit .husky/pre-push

# lint-staged の設定
cat > .lintstagedrc.js << 'EOL'
module.exports = {
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,css}": [
    "prettier --write"
  ]
};
EOL

# package.json に lint-staged の設定を追加
cat > lint-staged.config.js << 'EOL'
module.exports = {
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write",
    "vitest related --run" // 関連するテストのみを実行
  ],
  "*.{json,md,css}": [
    "prettier --write"
  ]
};
EOL
````

上記の設定により、以下のような自動化が行われます：

- **git commit 時**:

  - コミット対象のファイルに対してESLintによるリントチェック
  - Prettierによるコードフォーマット
  - 修正後、問題なければコミット実行

- **git push 時**:
  - TypeScriptの型チェック実行
  - Vitestによるユニットテスト実行
  - テストが失敗した場合、プッシュは中止されます

### GitHub Actionsワークフローの設定

```bash
# ディレクトリの作成
mkdir -p .github/workflows

# CI/CDのワークフロー設定
cat > .github/workflows/ci.yml << 'EOL'
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    name: 型チェック・リント
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8.10.0
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      - name: 依存関係のインストール
        run: pnpm install
      - name: リント実行
        run: pnpm lint
      - name: 型チェック
        run: pnpm type-check

  test:
    name: テスト
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8.10.0
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      - name: 依存関係のインストール
        run: pnpm install
      - name: ユニットテスト実行
        run: pnpm test
      - name: テストカバレッジチェック
        run: pnpm test:coverage
      - name: テストカバレッジのアップロード
        uses: actions/upload-artifact@v3
        with:
          name: coverage-report
          path: coverage/
      - name: テスト結果のコメント
        if: github.event_name == 'pull_request'
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          recreate: true
          path: coverage/lcov-report/index.html

  e2e-test:
    name: E2Eテスト
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8.10.0
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      - name: 依存関係のインストール
        run: pnpm install
      - name: Playwrightインストール
        run: pnpm exec playwright install --with-deps
      - name: ビルド
        run: pnpm build
      - name: E2Eテスト実行
        run: pnpm test:e2e
      - name: E2Eテスト結果のアップロード
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  deploy:
    name: デプロイ
    needs: [lint, test, e2e-test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8.10.0
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      - name: 依存関係のインストール
        run: pnpm install
      - name: ビルド
        run: pnpm build
      - name: Cloudflare Pagesへのデプロイ
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: pages deploy ./out --project-name=automationa-tools-application
EOL

# CIワークフローを確認
cat .github/workflows/ci.yml
```

GitHub Actionsでは以下の自動化が行われます：

- **プッシュ・PRの作成時**：

  - リントと型チェックのジョブ実行
  - ユニットテストの実行（カバレッジレポートの生成）
  - E2Eテストの実行（Playwrightによるブラウザテスト）
  - すべてのテスト結果をアーティファクトとして保存

- **mainブランチへのマージ時**：
  - すべてのチェックが通った後、自動デプロイを実行

### 継続的テスト用のGitHub Actionsワークフロー

定期的なテスト実行のための追加ワークフローを設定します：

```bash
# 継続的テスト用のワークフロー設定
cat > .github/workflows/scheduled-tests.yml << 'EOL'
name: スケジュールテスト

on:
  schedule:
    # 毎日午前3時に実行（UTC）
    - cron: '0 3 * * *'
  workflow_dispatch: # 手動実行も可能

jobs:
  test:
    name: 全テスト実行
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8.10.0
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      - name: 依存関係のインストール
        run: pnpm install
      - name: ユニットテスト実行
        run: pnpm test
      - name: E2Eテスト環境準備
        run: pnpm exec playwright install --with-deps
      - name: ビルド
        run: pnpm build
      - name: E2Eテスト実行
        run: pnpm test:e2e
      - name: テスト結果の通知
        if: always()
        uses: rtCamp/action-slack-notify@v2
        env:
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
          SLACK_CHANNEL: ci-notifications
          SLACK_TITLE: 定期テスト結果
          SLACK_COLOR: ${{ job.status }}
          SLACK_FOOTER: 'MVPアプリケーション'
EOL

# スケジュールワークフローを確認
cat .github/workflows/scheduled-tests.yml
```

この設定では：

- 毎日決まった時間（UTC 3:00 / 日本時間 12:00）に自動的にテストが実行されます
- 開発中に環境が壊れていないか確認できます
- テスト結果はSlackに通知されます（Webhook URLの設定が必要）
- 手動でも実行可能です（GitHub ActionsのUI上から）

### package.jsonスクリプトの拡張

テスト自動化をサポートするためにスクリプトを追加します：

```bash
# package.jsonのスクリプト部分を編集
cat > package.json.scripts << 'EOL'
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write \"**/*.{js,ts,tsx,json,md}\"",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:ci": "vitest run && playwright test",
    "test:changed": "vitest related --run $(git diff --name-only --staged)",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "prepare": "husky install"
  },
EOL

# 既存のpackage.jsonを更新（スクリプト部分のみ）
sed -i.bak '/\"scripts\": {/,/},/c\\'"$(cat package.json.scripts)" package.json
rm package.json.bak package.json.scripts
```

これらのスクリプトにより、以下のようなテスト実行が可能になります：

- `pnpm test` - すべてのユニットテストを実行
- `pnpm test:watch` - ファイル変更を監視しながらテスト実行
- `pnpm test:coverage` - カバレッジレポート付きでテスト実行
- `pnpm test:e2e` - E2Eテストの実行
- `pnpm test:ci` - CI環境用のテスト実行（ユニット＋E2E）
- `pnpm test:changed` - ステージングされた変更ファイルに関連するテストのみ実行

### プルリクエストテンプレートの作成

```bash
# ディレクトリの作成
mkdir -p .github/PULL_REQUEST_TEMPLATE

# PRテンプレートの作成
cat > .github/PULL_REQUEST_TEMPLATE.md << 'EOL'
## 変更内容

<!-- 変更の詳細を説明してください -->

## 変更理由

<!-- この変更が必要な理由を説明してください -->

## 影響範囲

<!-- この変更がシステムのどの部分に影響するか説明してください -->

## テスト方法

<!-- テストする方法を説明してください -->

## チェックリスト

- [ ] コードスタイルとリントチェックをパスしている
- [ ] 単体テストを追加/更新した
- [ ] 必要に応じて統合テストを追加/更新した
- [ ] ドキュメントを更新した（必要な場合）
- [ ] 変更内容を十分にレビューした

## スクリーンショット（UI変更の場合）

<!-- UI関連の変更がある場合、スクリーンショットを追加してください -->
EOL

# PRテンプレートを確認
cat .github/PULL_REQUEST_TEMPLATE.md
```

## 9. 初期コミット

### package.jsonスクリプトの設定

```bash
# package.jsonにスクリプトを追加（既存のpackage.jsonを編集）
cat > package.json << 'EOL'
{
  "name": "automationa-tools-application",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write \"**/*.{js,ts,tsx,json,md}\"",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:ci": "vitest run && playwright test",
    "test:changed": "vitest related --run $(git diff --name-only --staged)",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "prepare": "husky install"
  },
  "dependencies": {
    "@cloudflare/d1": "^1.5.1",
    "@hookform/resolvers": "^3.3.2",
    "@tanstack/react-query": "^5.8.4",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "date-fns": "^2.30.0",
    "drizzle-orm": "^0.29.0",
    "lucide-react": "^0.292.0",
    "next": "^14.0.3",
    "next-intl": "^3.2.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.48.2",
    "tailwind-merge": "^1.14.0",
    "tailwindcss-animate": "^1.0.7",
    "uuid": "^9.0.1",
    "zod": "^3.22.4",
    "zustand": "^4.4.6"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@testing-library/jest-dom": "^6.1.4",
    "@testing-library/react": "^14.1.2",
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.39",
    "@types/react-dom": "^18.2.17",
    "@types/uuid": "^9.0.7",
    "@typescript-eslint/eslint-plugin": "^6.12.0",
    "@typescript-eslint/parser": "^6.12.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "dotenv": "^16.3.1",
    "drizzle-kit": "^0.20.4",
    "eslint": "^8.54.0",
    "eslint-config-next": "^14.0.3",
    "eslint-config-prettier": "^9.0.0",
    "husky": "^8.0.3",
    "jsdom": "^22.1.0",
    "lint-staged": "^15.1.0",
    "postcss": "^8.4.31",
    "prettier": "^3.1.0",
    "tailwindcss": "^3.3.5",
    "typescript": "^5.3.2",
    "vitest": "^0.34.6"
  }
}
EOL

# 変更の確認
cat package.json
```

### 開発サーバーのテスト実行

```bash
# 開発サーバーの起動テスト（確認後にCtrl+Cで終了）
pnpm dev
```

### 初期コミットの作成

```bash
# すべての変更をコミット
git add .
git commit -m "初期プロジェクト設定: Next.js + Cloudflare + Drizzle ORM"

# リモートリポジトリへのプッシュ
git push origin main

# 開発ブランチの作成
git checkout -b develop
git push origin develop
```

## 10. 開発開始前のチェックリスト

以下の項目を確認して、開発準備が整っていることを確認してください：

✅ **基本環境**

- [ ] Node.js v18.18.0以上（推奨：v20.10.0）が正しくインストールされている
- [ ] pnpm v8.10.0以上が正しくインストールされている
- [ ] Git 2.40.0以上がインストールされている
- [ ] VSCodeと必要な拡張機能がインストールされている

✅ **プロジェクト設定**

- [ ] リポジトリが正しくクローンされている
- [ ] 依存関係がすべてインストールされている (`pnpm install`の実行)
- [ ] `.env.local`ファイルが作成され、必要な環境変数が設定されている
- [ ] `pnpm dev`で開発サーバーが正常に起動する
- [ ] `pnpm test`でテストが正常に実行される
- [ ] `pnpm lint`でリントが正常に実行される

✅ **Cloudflare設定**

- [ ] Cloudflareアカウントが作成され、アクセス可能である
- [ ] D1データベースが正しく作成されている
- [ ] KVネームスペースが正しく作成されている
- [ ] R2バケットが正しく作成されている
- [ ] wrangler.tomlが正しく設定されている

✅ **リポジトリ設定**

- [ ] mainブランチが保護されている（プルリクエスト必須）
- [ ] GitHub Actionsのワークフローが設定されている
- [ ] GitHub Secretsに必要な値が設定されている(CF_API_TOKEN, CF_ACCOUNT_ID)

✅ **ディレクトリ構造**

- [ ] すべての必要なディレクトリが作成されている
- [ ] 基本的なファイル（エラーハンドラなど）が作成されている
- [ ] Next.jsのApp Router構造が正しく設定されている

## 11. トラブルシューティング

### 一般的な問題と解決方法

#### Node.jsバージョンの問題

**症状**: パッケージのインストールエラーやNext.jsの起動エラー

**解決方法**:

```bash
# Node.jsバージョンの確認
node -v

# 推奨バージョンがインストールされていない場合
nvm install 20.10.0
nvm use 20.10.0

# 再度依存関係のインストール
rm -rf node_modules
pnpm install
```

#### pnpmコマンドが見つからないエラー

**症状**: `command not found: pnpm`エラーが表示される

**解決方法**:

```bash
# グローバルにpnpmをインストール
npm install -g pnpm

# または代替インストール方法
curl -fsSL https://get.pnpm.io/install.sh | sh -

# PATH環境変数を更新（必要に応じて）
export PATH="$HOME/.pnpm/bin:$PATH"
```

#### Cloudflare APIトークンの問題

**症状**: Cloudflareリソース作成時の認証エラー

**解決方法**:

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/) > プロフィール > APIトークン へ移動
2. 「APIトークンの作成」をクリック
3. 「編集者」テンプレートを選択
4. アカウントリソースとD1、KV、R2の権限を追加
5. トークンを生成し、wranglerで再度ログイン：

```bash
wrangler login
```

#### TypeScriptエラー

**症状**: 型エラーやTSコンパイルエラー

**解決方法**:

```bash
# TypeScriptキャッシュをクリア
rm -rf .next
rm -rf node_modules/.cache

# 型チェックを実行
pnpm type-check

# エラー箇所を修正
```

#### Next.js開発サーバーの問題

**症状**: 開発サーバーが起動しない、または異常終了する

**解決方法**:

```bash
# ポートが使用中の場合は別のポートを使用
pnpm dev -- -p 3001

# .nextディレクトリを削除して再構築
rm -rf .next
pnpm dev
```

#### ESLint/Prettierの問題

**症状**: フォーマットやリントエラーが表示される

**解決方法**:

```bash
# ESLintの実行
pnpm lint

# Prettierの実行
pnpm format

# VSCode設定が正しいことを確認
cat .vscode/settings.json
```

### サポートリソース

問題が解決しない場合は、以下のリソースを参照してください：

- [Next.js ドキュメント](https://nextjs.org/docs)
- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [Drizzle ORM ドキュメント](https://orm.drizzle.team/docs/overview)
- [チームのSlackチャンネル](#) - #automationa-tools-application-support

また、GitHubのIssueセクションでサポートを求めることもできます。
プロジェクト固有の問題は、[リポジトリのIssues](https://github.com/your-organization/automationa-tools-application/issues)に報告してください。

### テストカバレッジ要件の設定

重要なコードパスのテストカバレッジを段階的に80%以上に保つための設定を行います。

```bash
# Vitestの設定ファイルを作成（段階的なカバレッジ目標を設定）
cat > vitest.config.ts << 'EOL'
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// プロジェクトフェーズに応じてカバレッジ要件を調整
// 開発初期: 環境変数 COVERAGE_PHASE=1 (60%)
// 開発中期: 環境変数 COVERAGE_PHASE=2 (70%)
// 開発後期/本番: 環境変数 COVERAGE_PHASE=3 (80%)
const coveragePhase = process.env.COVERAGE_PHASE ? parseInt(process.env.COVERAGE_PHASE) : 1;

// フェーズに応じたカバレッジ閾値の設定
const getThresholds = (phase) => {
  const thresholds = {
    1: { // 初期フェーズ
      global: { statements: 50, branches: 50, functions: 50, lines: 50 },
      domain: { statements: 60, branches: 60, functions: 60, lines: 60 },
      infra: { statements: 60, branches: 55, functions: 60, lines: 60 },
      mastra: { statements: 60, branches: 55, functions: 60, lines: 60 },
    },
    2: { // 中期フェーズ
      global: { statements: 60, branches: 60, functions: 60, lines: 60 },
      domain: { statements: 70, branches: 70, functions: 70, lines: 70 },
      infra: { statements: 70, branches: 65, functions: 70, lines: 70 },
      mastra: { statements: 70, branches: 65, functions: 70, lines: 70 },
    },
    3: { // 最終フェーズ
      global: { statements: 70, branches: 70, functions: 70, lines: 70 },
      domain: { statements: 80, branches: 80, functions: 80, lines: 80 },
      infra: { statements: 80, branches: 75, functions: 80, lines: 80 },
      mastra: { statements: 80, branches: 75, functions: 80, lines: 80 },
    }
  };
  return thresholds[phase] || thresholds[3]; // デフォルトは最終フェーズ
};

const thresholds = getThresholds(coveragePhase);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // カバレッジ閾値を段階的に設定
      thresholds: {
        // 全体のカバレッジ目標
        global: thresholds.global,
        // 特に重要なディレクトリ/ファイルに対する厳格なカバレッジ要件
        './src/domain/**/*.{ts,tsx}': thresholds.domain,
        './src/infrastructure/**/*.{ts,tsx}': thresholds.infra,
        './src/mastra/**/*.{ts,tsx}': thresholds.mastra,
      },
      // テストから除外するファイル
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        '**/*.d.ts',
        'src/types/',
        'tests/',
        'test-utils/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
EOL

# エラーハンドリングを強化したカバレッジ計測スクリプトを追加
mkdir -p scripts
cat > scripts/check-coverage.js << 'EOL'
const fs = require('fs');
const path = require('path');

// カバレッジレポートファイルのパス
const coverageReportPath = path.resolve(__dirname, '../coverage/coverage-final.json');

// ファイルの存在確認
if (!fs.existsSync(coverageReportPath)) {
  console.error('\n❌ カバレッジレポートファイルが見つかりません。');
  console.error('  先にテストを実行して、カバレッジレポートを生成してください:');
  console.error('  > pnpm test:coverage\n');
  process.exit(1);
}

try {
  // カバレッジレポートを読み込む
  const coverageReport = JSON.parse(fs.readFileSync(coverageReportPath, 'utf8'));

  // 重要なパスのパターン
  const criticalPaths = [
    /src\/domain\//,
    /src\/infrastructure\//,
    /src\/mastra\//,
  ];

  let failedPaths = [];
  let criticalPathsCovered = 0;
  let criticalPathsTotal = 0;

  // カバレッジフェーズの取得（環境変数から）
  const coveragePhase = process.env.COVERAGE_PHASE ? parseInt(process.env.COVERAGE_PHASE) : 1;
  const phaseThresholds = {
    1: { statements: 60, branches: 55, functions: 60, lines: 60 }, // 初期フェーズ
    2: { statements: 70, branches: 65, functions: 70, lines: 70 }, // 中期フェーズ
    3: { statements: 80, branches: 75, functions: 80, lines: 80 }, // 最終フェーズ
  };
  const thresholds = phaseThresholds[coveragePhase] || phaseThresholds[3];

  console.log(`\n📊 カバレッジチェック - フェーズ ${coveragePhase}`);
  console.log(`   必要なカバレッジ閾値: statements=${thresholds.statements}%, branches=${thresholds.branches}%, functions=${thresholds.functions}%, lines=${thresholds.lines}%\n`);

  // 各ファイルをチェック
  Object.keys(coverageReport).forEach(filePath => {
    // 重要なパスかどうかを判定
    const isCriticalPath = criticalPaths.some(pattern => pattern.test(filePath));

    if (isCriticalPath) {
      criticalPathsTotal++;

      try {
        // そのファイルのカバレッジデータ
        const coverage = coverageReport[filePath];

        // ステートメント、ブランチ、関数、行のカバレッジを計算
        const statementsTotal = Object.keys(coverage.s).length;
        const statementsCovered = Object.values(coverage.s).filter(v => v > 0).length;
        const statementsPercent = statementsTotal > 0 ? (statementsCovered / statementsTotal) * 100 : 100;

        const branchesTotal = Object.keys(coverage.b).length * 2; // 各ブランチは2つの可能性
        const branchesCovered = branchesTotal > 0 ? Object.values(coverage.b).reduce((acc, [t, f]) => acc + t, 0) : 0;
        const branchesPercent = branchesTotal > 0 ? (branchesCovered / branchesTotal) * 100 : 100;

        const functionsTotal = Object.keys(coverage.f).length;
        const functionsCovered = Object.values(coverage.f).filter(v => v > 0).length;
        const functionsPercent = functionsTotal > 0 ? (functionsCovered / functionsTotal) * 100 : 100;

        const linesTotal = Object.keys(coverage.l).length;
        const linesCovered = Object.values(coverage.l).filter(v => v > 0).length;
        const linesPercent = linesTotal > 0 ? (linesCovered / linesTotal) * 100 : 100;

        // 閾値未満のものをチェック
        if (
          statementsPercent < thresholds.statements ||
          branchesPercent < thresholds.branches ||
          functionsPercent < thresholds.functions ||
          linesPercent < thresholds.lines
        ) {
          failedPaths.push({
            filePath,
            metrics: {
              statements: statementsPercent.toFixed(2),
              branches: branchesPercent.toFixed(2),
              functions: functionsPercent.toFixed(2),
              lines: linesPercent.toFixed(2),
            },
          });
        } else {
          criticalPathsCovered++;
        }
      } catch (err) {
        console.error(`\n⚠️ ファイル ${filePath} の解析中にエラーが発生しました: ${err.message}`);
        failedPaths.push({
          filePath,
          error: err.message
        });
      }
    }
  });

  // 結果を表示
  if (failedPaths.length > 0) {
    console.error(`\n❌ 以下の重要なファイルが必要なカバレッジ閾値を下回っています:`);
    failedPaths.forEach(({ filePath, metrics, error }) => {
      if (error) {
        console.error(`\n${filePath}: エラー - ${error}`);
      } else {
        console.error(`\n${filePath}:`);
        console.error(`  - Statements: ${metrics.statements}% (必要: ${thresholds.statements}%)`);
        console.error(`  - Branches: ${metrics.branches}% (必要: ${thresholds.branches}%)`);
        console.error(`  - Functions: ${metrics.functions}% (必要: ${thresholds.functions}%)`);
        console.error(`  - Lines: ${metrics.lines}% (必要: ${thresholds.lines}%)`);
      }
    });

    const overallCoverage = criticalPathsTotal > 0 ? (criticalPathsCovered / criticalPathsTotal) * 100 : 0;
    console.error(`\n重要なパスの合計カバレッジ: ${overallCoverage.toFixed(2)}% (${criticalPathsCovered}/${criticalPathsTotal})\n`);

    console.error(`ヒント: テストを追加するか、より低いフェーズでカバレッジチェックを実行してください:`);
    console.error(`  COVERAGE_PHASE=1 pnpm test:coverage:check  # 初期フェーズ (60%)`);
    console.error(`  COVERAGE_PHASE=2 pnpm test:coverage:check  # 中期フェーズ (70%)`);
    console.error(`  COVERAGE_PHASE=3 pnpm test:coverage:check  # 最終フェーズ (80%)\n`);

    process.exit(1); // エラーコードで終了
  } else if (criticalPathsTotal === 0) {
    console.log('\n⚠️ 重要なパスのファイルが見つかりませんでした。テスト対象を確認してください。\n');
    process.exit(0);
  } else {
    console.log(`\n✅ すべての重要なファイル(${criticalPathsTotal}個)が必要なカバレッジ閾値を満たしています。\n`);
    process.exit(0);
  }
} catch (err) {
  console.error(`\n❌ カバレッジチェックの実行中にエラーが発生しました: ${err.message}\n`);
  process.exit(1);
}
EOL

# package.jsonにカバレッジチェックスクリプトを追加（段階的アプローチを反映）
cat > package.json.coverage-scripts << 'EOL'
    "test:coverage:check": "vitest run --coverage && node scripts/check-coverage.js",
    "test:coverage:phase1": "COVERAGE_PHASE=1 vitest run --coverage && COVERAGE_PHASE=1 node scripts/check-coverage.js",
    "test:coverage:phase2": "COVERAGE_PHASE=2 vitest run --coverage && COVERAGE_PHASE=2 node scripts/check-coverage.js",
    "test:coverage:phase3": "COVERAGE_PHASE=3 vitest run --coverage && COVERAGE_PHASE=3 node scripts/check-coverage.js",
EOL

# 既存のpackage.json内のtest:coverage行を検索し、その後に新しいスクリプトを追加
sed -i.bak '/test:coverage/a \    "test:coverage:check": "vitest run --coverage \&\& node scripts\/check-coverage.js",\n    "test:coverage:phase1": "COVERAGE_PHASE=1 vitest run --coverage \&\& COVERAGE_PHASE=1 node scripts\/check-coverage.js",\n    "test:coverage:phase2": "COVERAGE_PHASE=2 vitest run --coverage \&\& COVERAGE_PHASE=2 node scripts\/check-coverage.js",\n    "test:coverage:phase3": "COVERAGE_PHASE=3 vitest run --coverage \&\& COVERAGE_PHASE=3 node scripts\/check-coverage.js",' package.json
rm -f package.json.bak package.json.coverage-scripts

# GitHub Actionsワークフローを修正して段階的カバレッジを反映
cat > .github/workflows/coverage-check.yml << 'EOL'
name: カバレッジチェック

on:
  pull_request:
    branches: [main, develop]
    paths:
      - 'src/domain/**'
      - 'src/infrastructure/**'
      - 'src/mastra/**'

jobs:
  coverage-check:
    name: 重要コードパスのカバレッジチェック
    runs-on: ubuntu-latest
    strategy:
      matrix:
        coverage-phase: [1, 2, 3]
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8.10.0
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      - name: 依存関係のインストール
        run: pnpm install
      - name: カバレッジチェック実行 (フェーズ ${{ matrix.coverage-phase }})
        id: coverage
        run: pnpm test:coverage:phase${{ matrix.coverage-phase }}
        continue-on-error: ${{ matrix.coverage-phase > 1 }}
      - name: カバレッジ結果をPRにコメント
        if: always()
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: coverage-report-phase${{ matrix.coverage-phase }}
          message: |
            ## テストカバレッジレポート (フェーズ ${{ matrix.coverage-phase }})

            ${{ steps.coverage.outcome == 'success' && '✅ カバレッジ基準を満たしています' || '⚠️ このフェーズのカバレッジ基準を満たしていません' }}

            フェーズ1 (60%): ${{ matrix.coverage-phase >= 1 && steps.coverage.outcome == 'success' ? '✅ 合格' : (matrix.coverage-phase == 1 ? '❌ 不合格' : '⏳ 未確認') }}
            フェーズ2 (70%): ${{ matrix.coverage-phase >= 2 && steps.coverage.outcome == 'success' ? '✅ 合格' : (matrix.coverage-phase == 2 ? '❌ 不合格' : '⏳ 未確認') }}
            フェーズ3 (80%): ${{ matrix.coverage-phase >= 3 && steps.coverage.outcome == 'success' ? '✅ 合格' : (matrix.coverage-phase == 3 ? '❌ 不合格' : '⏳ 未確認') }}

            詳細はワークフローの実行ログをご確認ください。
EOL
```

この設定により、以下のようにテストカバレッジ要件が改善されます：

- **段階的なカバレッジ目標**:

  - フェーズ1 (開発初期): 60%
  - フェーズ2 (開発中期): 70%
  - フェーズ3 (開発後期/本番): 80%

- **環境に応じた柔軟な適用**:

  - 環境変数 `COVERAGE_PHASE` で簡単に切り替え可能
  - 便利なスクリプト: `pnpm test:coverage:phase1`, `phase2`, `phase3`

- **エラーハンドリングの強化**:

  - ファイル存在チェックとわかりやすいエラーメッセージ
  - カバレッジ計算中の例外処理
  - 改善のためのヒント表示

- **GitHub Actions連携**:
  - 一度のPRで全てのフェーズを確認
  - 各フェーズごとの結果を別々にコメント
  - フェーズ1のみ必須、他は情報提供として表示

これにより、開発初期からテスト駆動開発を促進しつつ、開発が進むにつれて段階的にテストカバレッジを向上させるアプローチが可能になります。

## 6. 環境変数とシークレット管理

プロジェクトの環境変数とシークレットを安全に管理するための設定を行います。

```bash
# .env.sample ファイルの作成（バージョン管理対象）
cat > .env.sample << 'EOL'
# アプリケーション設定
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_ENV=development

# Cloudflare設定
CF_ACCOUNT_ID=your-account-id-here
CF_API_TOKEN=your-api-token-here

# データベース設定
D1_DATABASE_ID=your-d1-database-id-here
KV_NAMESPACE_ID=your-kv-namespace-id-here
R2_BUCKET_NAME=automationa-tools-storage

# 認証設定
JWT_SECRET=your-secret-here-minimum-32-chars
JWT_EXPIRES_IN=7d
COOKIE_SECRET=your-cookie-secret-here

# 外部API設定
OPENAI_API_KEY=your-openai-api-key-here
EOL

# .env.local ファイルの作成（バージョン管理対象外）
cat > .env.local << 'EOL'
# ローカル開発用環境変数
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_ENV=development

# Cloudflare設定（開発用）
CF_ACCOUNT_ID=
CF_API_TOKEN=

# データベース設定（ローカル開発用）
DATABASE_URL=

# 認証設定（開発用に自動生成）
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d
COOKIE_SECRET=$(openssl rand -base64 32)

# 外部API設定
OPENAI_API_KEY=
EOL

# テスト用の環境変数
cat > .env.test << 'EOL'
# テスト用環境変数
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_ENV=test

# テスト用ダミーシークレット
JWT_SECRET=test-jwt-secret-for-testing-purposes-only
JWT_EXPIRES_IN=1h
COOKIE_SECRET=test-cookie-secret-for-testing-purposes

# テスト用ダミーAPI設定
OPENAI_API_KEY=sk-test
EOL

# E2Eテスト用の環境変数
cat > .env.e2e << 'EOL'
# E2Eテスト用環境変数
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_ENV=test

# E2Eテスト設定
E2E_BASE_URL=http://localhost:3000
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=Test123!
EOL

# Cloudflare設定ファイル
cat > wrangler.toml << 'EOL'
name = "automationa-tools-application"
compatibility_date = "2023-12-01"
main = "src/worker.ts"

# D1データベース設定
[[d1_databases]]
binding = "DB"
database_name = "automationa-tools-db"
database_id = "${D1_DATABASE_ID}"

# KV設定
[[kv_namespaces]]
binding = "KV_CACHE"
id = "${KV_NAMESPACE_ID}"

# R2バケット設定
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "automationa-tools-storage"

# 環境変数設定
[vars]
ENVIRONMENT = "production"

# 開発環境向け
[env.development]
workers_dev = true
[env.development.vars]
ENVIRONMENT = "development"

# ステージング環境向け
[env.staging]
[env.staging.vars]
ENVIRONMENT = "staging"

# Pages設定
[site]
bucket = "./out"

# 環境変数とシークレットマッピング
# 実際の値はCloudflare Dashboardまたはwrangler secretで設定
# wrangler secret put JWT_SECRET --env production
EOL

# 環境変数型定義ファイル（TypeScript）
mkdir -p src/types
cat > src/types/env.d.ts << 'EOL'
declare namespace NodeJS {
  interface ProcessEnv {
    // アプリケーション設定
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_API_URL: string;
    NEXT_PUBLIC_APP_ENV: 'development' | 'test' | 'staging' | 'production';

    // Cloudflare設定
    CF_ACCOUNT_ID?: string;
    CF_API_TOKEN?: string;

    // データベース設定
    D1_DATABASE_ID?: string;
    KV_NAMESPACE_ID?: string;
    R2_BUCKET_NAME?: string;

    // 認証設定
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    COOKIE_SECRET: string;

    // 外部API設定
    OPENAI_API_KEY?: string;
  }
}
EOL

# 環境変数ユーティリティ関数
mkdir -p src/lib/config
cat > src/lib/config/env.ts << 'EOL'
/**
 * 環境変数を安全に取得するユーティリティ
 *
```
