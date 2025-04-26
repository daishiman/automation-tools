# APIキーの取得と設定方法

このプロジェクトでは、GitHubとOpenAIのAPIキーを使用してPRとコミットメッセージの自動生成を行います。
以下の手順に従ってAPIキーを取得し、設定してください。

## 必要なAPIキー

1. **GitHub Personal Access Token (PAT)**

   - PRの自動作成とコミット差分の取得に使用
   - 必要な権限: リポジトリへの書き込み権限

2. **OpenAI API Key**
   - AIによるPRとコミットメッセージの生成に使用

## GitHub Personal Access Tokenの取得方法

1. [GitHub](https://github.com)にログイン
2. 右上のプロフィールアイコンをクリック → 「Settings」を選択
3. 左サイドバーの一番下にある「Developer settings」をクリック
4. 「Personal access tokens」→「Fine-grained tokens」を選択
5. 「Generate new token」をクリック
6. トークンに名前を付ける（例: PR Generator）
7. 有効期限を選択（長期間使用する場合でも定期的に更新することをお勧めします）
8. 「Repository access」セクションで「Only select repositories」を選択し、必要なリポジトリを指定
9. 「Permissions」セクションで以下の権限を設定:
   - Repository permissions:
     - Contents: Read and write（リポジトリ内容の読み書き）
     - Pull requests: Read and write（PRの作成・編集）
10. 「Generate token」ボタンをクリック
11. 表示されたトークンをコピーして安全な場所に保管（**このトークンは一度しか表示されません**）

## OpenAI API Keyの取得方法

1. [OpenAI Platform](https://platform.openai.com/)にアクセス
2. アカウントを作成またはログイン
3. 右上のプロフィールアイコンをクリック → 「View API keys」を選択
4. 「Create new secret key」ボタンをクリック
5. キーに名前を付けて「Create secret key」ボタンをクリック
6. 表示されたAPIキーをコピーして安全な場所に保管（**このキーは一度しか表示されません**）

## APIキーの設定方法

プロジェクトルートに`.env.local`ファイルを作成し、以下の内容を記述します：

```
# GitHub API関連
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your_github_username_or_org
GITHUB_REPO=your_repository_name
PR_BASE_BRANCH=main

# OpenAI API関連
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o
```

各項目の説明：

- `GITHUB_TOKEN`: 取得したGitHub Personal Access Token
- `GITHUB_OWNER`: GitHubのユーザー名またはOrganization名
- `GITHUB_REPO`: リポジトリ名
- `PR_BASE_BRANCH`: PRのベースブランチ（通常は`main`または`master`）
- `OPENAI_API_KEY`: 取得したOpenAI APIキー
- `OPENAI_MODEL`: 使用するOpenAIのモデル（推奨: `gpt-4o`）

## 使用上の注意

- APIキーは秘密情報です。`.env.local`ファイルはGitリポジトリにコミットしないでください。
- `.gitignore`に`.env.local`が含まれていることを確認してください。
- GitHub PATは定期的に更新することを推奨します。
- OpenAI APIは使用量に応じて課金されますので、使用状況を監視してください。

## トラブルシューティング

**「認証エラー」が発生する場合:**

- GitHub PATが有効か確認してください。
- 必要な権限（リポジトリの内容とPRへのアクセス）が付与されているか確認してください。
- トークンが期限切れでないか確認してください。

**「APIキーが無効」エラーが発生する場合:**

- OpenAI APIキーが正しく設定されているか確認してください。
- OpenAIアカウントの支払い情報が有効か確認してください。

**「リポジトリが見つからない」エラーが発生する場合:**

- `GITHUB_OWNER`と`GITHUB_REPO`の値が正しいか確認してください。
- GitHubトークンに該当リポジトリへのアクセス権があるか確認してください。
