#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// __dirnameの代替（ESモジュールでは__dirnameは使用できない）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// プロジェクトルートディレクトリとGitフックディレクトリを取得
const projectRoot = path.resolve(__dirname, '..');
const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim();
const gitHooksDir = path.join(projectRoot, gitDir, 'hooks');

// インストールするカスタムフック
const customHooks = ['pre-add'];

// カスタムGitフック「pre-add」の内容
const preAddHookContent = `#!/bin/sh

# git addコマンドをトラップして、pre-addフックを実行
# オリジナルのgit addコマンドを保存
alias real_git_add="\\git add"

# git add関数をオーバーライド
git_add() {
  # huskyのpre-addフックが存在すれば実行
  pre_add_hook="$(git rev-parse --show-toplevel)/.husky/pre-add"
  if [ -f "$pre_add_hook" ]; then
    echo "🔍 pre-addフックを実行中..."
    "$pre_add_hook"
    hook_result=$?
    if [ $hook_result -ne 0 ]; then
      echo "❌ pre-addフックが失敗しました。"
      return $hook_result
    fi
  fi

  # 実際のgit addコマンドを実行
  real_git_add "$@"
}

# git add関数を使用
git_add "$@"
`;

// Gitフックディレクトリが存在するか確認
if (!fs.existsSync(gitHooksDir)) {
  console.error(`❌ Gitフックディレクトリが見つかりません: ${gitHooksDir}`);
  process.exit(1);
}

console.log('🔧 カスタムGitフックをインストール中...');

// 各カスタムフックをインストール
for (const hook of customHooks) {
  const hookPath = path.join(gitHooksDir, hook);

  // フックの内容を決定
  let hookContent;
  if (hook === 'pre-add') {
    hookContent = preAddHookContent;
  } else {
    // 他のフックがあれば、ここに追加
    continue;
  }

  // フックファイルを書き込む
  fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
  console.log(`✅ ${hook}フックをインストールしました: ${hookPath}`);
}

// Gitエイリアスの設定方法を表示
console.log(`
🔍 インストール完了！

カスタムGitフックを有効にするには、以下のコマンドを実行してください:

    git config --global alias.real-add add
    git config --global alias.add '!$(git rev-parse --git-dir)/hooks/pre-add'

これにより、'git add'コマンドを使用すると自動的にlint、formatチェックが実行されます。
`);

console.log('✨ カスタムGitフックのインストールが完了しました！');
