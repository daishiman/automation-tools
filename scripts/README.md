# 開発サポートスクリプト

このディレクトリには、開発プロセスをサポートするための便利なスクリプトが含まれています。

## Git自動テストスクリプト

`git-auto-test.js`は、Git操作（add/commit/push）時に適切なテストを自動的に実行するスクリプトです。各Git操作に最適なテスト戦略を適用することで、品質を確保しながら開発効率を最大化します。

### テスト戦略

| Git操作 | テスト戦略                               | 目的                                       |
| ------- | ---------------------------------------- | ------------------------------------------ |
| add     | リント + 変更ファイル関連テスト          | 変更量が少ないうちに問題を発見             |
| commit  | 型チェック + ユニットテスト              | コードの一貫性と機能の正常性を確保         |
| push    | 型チェック + ユニットテスト + 統合テスト | 共有リポジトリに品質の高いコードをプッシュ |

### 使用方法

```bash
# テスト実行後にGit操作を行う
pnpm git:add             # 変更ファイルのテスト実行後、git addを実行
pnpm git:commit "メッセージ" # ユニットテスト実行後、git commitを実行
pnpm git:push            # 全テスト実行後、git pushを実行

# テストのみ実行（Git操作は行わない）
pnpm git:add-test        # git add前のテストのみ実行
pnpm git:commit-test     # git commit前のテストのみ実行
pnpm git:push-test       # git push前のテストのみ実行
```

直接スクリプトを呼び出すこともできます：

```bash
node scripts/git-auto-test.js add
node scripts/git-auto-test.js commit "機能Aの実装"
node scripts/git-auto-test.js push
```

### Git Hooks設定

`git-hooks.js`スクリプトを使用して、Gitフックを自動的に設定することもできます：

```bash
pnpm git:install-hooks
```

これにより、pre-commit、pre-push、post-mergeなどのフックが自動的に設定されます。

## その他のスクリプト

- `start-dev.js` - 開発サーバーを起動
- `migrate.js` - データベースマイグレーションを実行
- `docker-dev.js` - Docker開発環境のヘルパースクリプト

## ベストプラクティス

1. **継続的な検証**: 小さな変更ごとに`git:add`を使用して早期にフィードバックを得る
2. **レビュー前チェック**: プルリクエスト作成前に`git:push-test`でコードの品質を確認
3. **テストファースト**: 新機能開発時は先にテストを書き、`git:commit-test`で検証
4. **チーム共有**: 新しいチームメンバーには`git:install-hooks`の実行を促す
