#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// __dirnameの代替（ESモジュールでは__dirnameは使用できない）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// プロジェクトルートディレクトリを取得
const scriptDir = __dirname;
const projectRoot = path.resolve(scriptDir, '..');

// コマンドライン引数の取得（最初の2つは node と スクリプト名）
const args = process.argv.slice(2);

// ヘルプを表示
function showHelp() {
  console.log(`
📋 smart-add - git addコマンドの拡張版

使用方法:
  git add [file1] [file2] ...      ファイルをステージングに追加
  git add -h, --help               このヘルプを表示

説明:
  このコマンドはファイルをgitのステージングエリアに追加する前に、
  自動的にlint、format、型チェックなどの検証を実行します。
  標準のgit addと同じように使用できますが、コード品質チェックが自動的に行われます。

例:
  git add src/components/Button.tsx  # 単一ファイルの追加
  git add .                          # すべての変更をステージング
  `);
}

// ヘルプオプションの確認
if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  showHelp();
  process.exit(args.length === 0 ? 1 : 0);
}

try {
  // pre-addフックが存在するか確認
  const preAddHookPath = path.join(projectRoot, '.husky', 'pre-add');

  if (fs.existsSync(preAddHookPath)) {
    console.log('🔍 pre-addフックを実行中...');

    try {
      // フックを実行
      execSync(`${preAddHookPath}`, {
        stdio: 'inherit',
        cwd: projectRoot,
      });

      console.log('✅ pre-addフックが成功しました');
    } catch (hookError) {
      console.error('❌ pre-addフックが失敗しました');
      process.exit(1);
    }
  }

  // git addコマンドを実行（エイリアスではなくコマンド自体を直接実行）
  const filesToAdd = args.join(' ');
  console.log(`🔍 ファイルを追加中: ${filesToAdd}`);

  // 再帰的呼び出しを避けるため、コマンド名を明示的に指定
  execSync(`command git add ${filesToAdd}`, {
    stdio: 'inherit',
    cwd: projectRoot,
  });

  console.log('✅ ファイルが正常に追加されました');
} catch (error) {
  console.error(`❌ エラーが発生しました: ${error.message}`);
  process.exit(1);
}
