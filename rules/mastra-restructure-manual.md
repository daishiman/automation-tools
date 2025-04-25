# Mastraディレクトリ構造再編成ツール マニュアル

## 目的

このツールは、Mastraディレクトリ構造をSOLID原則に沿って再編成するためのものです。これにより以下のメリットが得られます：

- コードの可読性向上
- 保守性の向上
- 開発効率の向上
- 依存関係の明確化
- モジュール間の結合度低減

## 使用方法

### 直接TypeScriptを実行する場合

1. `ts-node`がインストールされていることを確認してください
2. 以下のコマンドを実行します：

```bash
ts-node scripts/restructure-mastra.ts
```

### JavaScriptにコンパイルして実行する場合

1. TypeScriptをコンパイルします：

```bash
tsc scripts/restructure-mastra.ts --outDir dist
```

2. 生成されたJavaScriptを実行します：

```bash
node dist/scripts/restructure-mastra.js
```

## 実行内容

スクリプトは以下の処理を行います：

1. 新しいディレクトリ構造の作成
2. 既存ファイルの新しい構造へのコピー
3. 各ディレクトリに`index.ts`ファイルの生成

## 新しいディレクトリ構造

```
src/mastra/
├── shared/              # 共通コンポーネント
│   ├── core/            # 基本機能
│   ├── types/           # 型定義
│   └── constants/       # 定数
│       └── prompts/     # プロンプト
│           └── rag/     # RAG関連プロンプト
├── workflows/           # ワークフロー定義
│   └── github/          # GitHub関連ワークフロー
├── tools/               # ツール定義
│   └── github/          # GitHub関連ツール
├── integrations/        # 外部サービス連携
│   └── github/          # GitHub API連携
├── rag/                 # RAG（検索拡張生成）機能
│   └── core/            # RAG基本機能
├── agents/              # エージェント定義
├── memory/              # メモリ管理
├── observability/       # 可観測性機能
└── evals/               # 評価機能
```

## 注意事項

1. このスクリプトは既存のファイルを削除しません。新しい構造が正常に動作することを確認した後、手動で不要なファイルを削除してください。

2. エラーが発生した場合は、スクリプトを中断して問題を修正してから再実行してください。

3. ファイルをコピーした後は、アプリケーションが正常に動作することを確認してください。

4. 移行後に問題が発生した場合は、元のファイル構造を参照してください。
