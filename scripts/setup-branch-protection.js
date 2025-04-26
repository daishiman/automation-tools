#!/usr/bin/env node
/**
 * GitHub ブランチ保護設定スクリプト
 * 使用法: node setup-branch-protection.js <GITHUB_TOKEN> <OWNER> <REPO>
 */

const https = require('https');

// 引数チェック
const args = process.argv.slice(2);
if (args.length !== 3) {
  console.log(`使用法: ${process.argv[1]} <GITHUB_TOKEN> <OWNER> <REPO>`);
  process.exit(1);
}

const GITHUB_TOKEN = args[0];
const OWNER = args[1];
const REPO = args[2];

/**
 * GitHubのREST APIにリクエストを送信する関数
 * @param {string} endpoint - API エンドポイント（/から始まる部分）
 * @param {string} method - HTTPメソッド
 * @param {Object} data - リクエストボディ
 * @returns {Promise<Object>} - レスポンスボディ
 */
function sendGitHubRequest(endpoint, method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method: method,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'GitHub-Branch-Protection-Script',
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = responseData ? JSON.parse(responseData) : {};
            resolve(parsedData);
          } catch (error) {
            resolve(responseData);
          }
        } else {
          reject(
            new Error(`API request failed with status code ${res.statusCode}: ${responseData}`)
          );
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * ブランチ保護設定を行う関数
 */
async function setupBranchProtection() {
  try {
    // mainブランチの保護設定
    console.log('mainブランチの保護設定を構成中...');
    await sendGitHubRequest(`/repos/${OWNER}/${REPO}/branches/main/protection`, 'PUT', {
      required_status_checks: {
        strict: true,
        contexts: ['lint', 'test', 'build'],
      },
      enforce_admins: true,
      required_pull_request_reviews: {
        dismissal_restrictions: {},
        dismiss_stale_reviews: true,
        require_code_owner_reviews: true,
        required_approving_review_count: 2,
      },
      restrictions: null,
    });

    // developブランチの保護設定
    console.log('developブランチの保護設定を構成中...');
    await sendGitHubRequest(`/repos/${OWNER}/${REPO}/branches/develop/protection`, 'PUT', {
      required_status_checks: {
        strict: true,
        contexts: ['lint', 'test'],
      },
      enforce_admins: false,
      required_pull_request_reviews: {
        dismissal_restrictions: {},
        dismiss_stale_reviews: true,
        require_code_owner_reviews: false,
        required_approving_review_count: 1,
      },
      restrictions: null,
    });

    // GitHub Environments設定（APIでは現在不完全なサポート）
    console.log('GitHub Environments設定...');
    console.log('注意: GitHub Environmentsの完全な設定にはUIから追加設定が必要な場合があります');

    // production環境設定
    await sendGitHubRequest(`/repos/${OWNER}/${REPO}/environments/production`, 'PUT', {
      wait_timer: 30,
      reviewers: {
        users: ['username1', 'username2'],
      },
      deployment_branch_policy: {
        protected_branches: true,
        custom_branch_policies: false,
      },
    });

    // development環境設定
    await sendGitHubRequest(`/repos/${OWNER}/${REPO}/environments/development`, 'PUT', {
      wait_timer: 0,
      reviewers: {
        users: [],
      },
      deployment_branch_policy: {
        protected_branches: false,
        custom_branch_policies: true,
      },
    });

    console.log('ブランチ保護設定とGitHub Environments設定が完了しました');
    console.log('UIから設定を確認して、必要に応じて追加調整してください');
  } catch (error) {
    console.error(`エラーが発生しました: ${error.message}`);
    process.exit(1);
  }
}

// スクリプトを実行
setupBranchProtection();
