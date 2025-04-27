# テスト構成

このディレクトリには、プロジェクトのテストコードが含まれています。テストは以下のカテゴリに分類されています。

## テストの種類

### 1. 単体テスト (Unit Tests)

`/tests/unit/` - 個々のコンポーネント、関数、クラスを分離してテストします。

- `domain/` - ドメイン層（ビジネスロジック）のテスト
- `infrastructure/` - インフラストラクチャ層のテスト
- `mastra/` - Mastraフレームワーク固有機能のテスト

### 2. 統合テスト (Integration Tests)

`/tests/integration/` - 複数のコンポーネントの連携をテストします。

- `api/` - APIエンドポイントの統合テスト
- `database/` - データベース操作の統合テスト
- `mastra/` - Mastraワークフローの統合テスト

### 3. E2Eテスト (End-to-End Tests)

`/tests/e2e/` - ユーザーの視点からアプリケーション全体の動作をテストします。

- `pages/` - ページオブジェクトモデル
- `workflows/` - 複数ページにまたがるワークフロー

### 4. パフォーマンステスト (Performance Tests)

`/tests/performance/` - アプリケーションのパフォーマンス特性をテストします。

- `metrics/` - パフォーマンス計測メトリクス

## テスト設定ファイル

設定ファイルは `/tests/config/` ディレクトリに配置されています：

- `vitest.config.ts` - メインの設定ファイル
- `vitest.unit.ts` - 単体テスト用設定
- `vitest.integration.ts` - 統合テスト用設定
- `vitest.e2e.ts` - E2Eテスト用設定
- `vitest.performance.ts` - パフォーマンステスト用設定

## ヘルパーとユーティリティ

テスト用のヘルパーとユーティリティは `/tests/helpers/` ディレクトリに配置されています：

- `setup.ts` - 共通セットアップ
- `mocks/` - モックオブジェクト
- `factories/` - テストデータファクトリー

## テストデータ

テスト用のフィクスチャデータは `/tests/fixtures/` ディレクトリに配置されています。

## テストの実行方法

各テストタイプの実行コマンドは以下の通りです：

```bash
# 単体テスト
pnpm run test:unit        # ウォッチモード
pnpm run test:unit:run    # 一度だけ実行

# 統合テスト
pnpm run test:integration        # ウォッチモード
pnpm run test:integration:run    # 一度だけ実行

# E2Eテスト
pnpm run test:e2e         # Playwright テスト
pnpm run test:e2e:ui      # Playwright UI モード

# パフォーマンステスト
pnpm run test:performance        # ウォッチモード
pnpm run test:performance:run    # 一度だけ実行

# すべてのテスト
pnpm run test             # すべてのテストを実行

# カバレッジレポート
pnpm run test:coverage    # カバレッジレポートを生成
```
