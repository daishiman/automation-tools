# Mastraリストラクチャリングツール マニュアル

## 目的

このツールは、Mastraディレクトリ構造を再構築し、次の効果をもたらします：

- **コードの可読性向上**：機能ごとにコードを整理し、関連するファイルをグループ化
- **保守性の向上**：明確なディレクトリ構造によって、ファイルの場所をより直感的に把握可能
- **開発効率の向上**：関連するコードが同じディレクトリに配置されるため、開発時の探索が容易に
- **依存関係の明確化**：モジュール間の依存関係がディレクトリ構造から明確に
- **モジュール間の結合度低減**：明確な境界によって不適切な依存関係の発生を防止

## 実行方法

### 直接実行

```bash
npx ts-node scripts/restructure-mastra.ts
```

### コンパイル後実行

```bash
# コンパイル
npx tsc scripts/restructure-mastra.ts --outDir dist
# 実行
node dist/scripts/restructure-mastra.js
```

## スクリプトの動作

1. 新しいディレクトリ構造を作成
2. 既存ファイルを新しい場所にコピー
3. 各ディレクトリに`index.ts`ファイルを生成（エクスポートを自動設定）

> **注意**: スクリプトは既存のファイルを削除しません。新しい構造が正しく機能することを確認した後、不要なファイルを手動で削除してください。

## 新しいディレクトリ構造

```
src/mastra/
├── shared/              # 共通コンポーネント
│   ├── core/            # コアロジック
│   ├── types/           # 型定義
│   └── constants/       # 定数（プロンプトなど）
│       └── prompts/
│           └── rag/
├── workflows/           # ワークフロー実装
│   └── github/
├── tools/               # ツール実装
│   └── github/
├── integrations/        # 外部サービス統合
│   └── github/
├── rag/                 # RAG機能
│   └── core/
├── agents/              # エージェント実装
├── memory/              # メモリ管理
├── observability/       # 監視機能
└── evals/               # 評価機能
```

## ファイルマッピング

以下の表は、元のファイルパスと新しいファイルパスの対応を示しています：

| 元のパス                           | 新しいパス                                |
| ---------------------------------- | ----------------------------------------- |
| core/workflow.ts                   | shared/core/workflow.ts                   |
| core/tool.ts                       | shared/core/tool.ts                       |
| core/runnable.ts                   | shared/core/runnable.ts                   |
| types/mastra-core.d.ts             | shared/types/mastra-core.d.ts             |
| types/prompts.ts                   | shared/types/prompts.ts                   |
| constants/prompts/rag/retrieval.ts | shared/constants/prompts/rag/retrieval.ts |
| constants/prompts/rag/answer.ts    | shared/constants/prompts/rag/answer.ts    |
| tools/github.ts                    | tools/github/github-tools.ts              |
| workflows/github.ts                | workflows/github/github-workflow.ts       |
| integrations/github/client.ts      | integrations/github/client.ts             |
| rag/retrieval.ts                   | rag/core/retrieval.ts                     |
| rag/answer.ts                      | rag/core/answer.ts                        |
