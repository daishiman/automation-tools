#!/bin/bash

# Prettierを使って問題を修正するスクリプト
echo "Prettierを使用してフォーマットの問題を修正しています..."

# vitest.config.tsの修正
npx prettier --write vitest.config.ts

# タスクスキーマテストの修正
npx prettier --write tests/unit/infrastructure/database/drizzle/task/schema.test.ts

echo "修正が完了しました。"