#!/usr/bin/env node

/**
 * このスクリプトは、必要なGitHub SecretsとCloudflare APIの設定を検証します
 * 使用方法: node scripts/verify-secrets.js
 */

// 必要なライブラリをインポート
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// .envファイルを読み込む
dotenv.config();

// 必須の環境変数リスト
const REQUIRED_SECRETS = [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'D1_DATABASE_ID',
  'KV_CACHE_ID',
  'KV_SESSION_STORE_ID',
];

// 環境変数のチェック
console.log('🔍 GitHub Secretsの検証を開始...\n');

let missingSecrets = false;

// 必須環境変数のチェック
REQUIRED_SECRETS.forEach((secretName) => {
  const secretValue = process.env[secretName];
  if (!secretValue) {
    console.error(`❌ ${secretName}が設定されていません`);
    missingSecrets = true;
  } else {
    // 形式チェック
    if (secretName === 'CLOUDFLARE_ACCOUNT_ID' && !/^[0-9a-f]{32}$/.test(secretValue)) {
      console.warn(`⚠️ ${secretName}の形式が正しくない可能性があります（32文字の16進数を期待）`);
    }
    console.log(`✅ ${secretName}が設定されています`);
  }
});

if (missingSecrets) {
  console.error('\n❌ 不足しているシークレットがあります。GitHub Secretsを確認してください。');
  process.exit(1);
}

console.log('\n🔍 Cloudflare APIトークンの権限を検証中...');

// Cloudflare APIトークンの検証
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

if (CF_TOKEN && CF_ACCOUNT_ID) {
  try {
    // ユーザー情報を取得（User Details権限のテスト）
    const userResponse = await fetch('https://api.cloudflare.com/client/v4/user', {
      headers: {
        Authorization: `Bearer ${CF_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const userData = await userResponse.json();

    if (userData.success) {
      console.log('✅ User Details権限: 正常');
    } else {
      console.warn('⚠️ User Details権限: 不足している可能性があります');
    }

    // KV名前空間リストを取得（KV権限のテスト）
    const kvResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces`,
      {
        headers: {
          Authorization: `Bearer ${CF_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const kvData = await kvResponse.json();

    if (kvData.success) {
      console.log('✅ KV Storage権限: 正常');
      console.log(`📊 KV名前空間の数: ${kvData.result.length}`);

      // KV_CACHE_IDが実際のKV名前空間に存在するか確認
      const cacheId = process.env.KV_CACHE_ID;
      if (cacheId) {
        const cacheNamespace = kvData.result.find((ns) => ns.id === cacheId);
        if (cacheNamespace) {
          console.log(`✅ KV_CACHE_ID (${cacheNamespace.title}): 有効`);
        } else {
          console.warn(`⚠️ KV_CACHE_ID: 指定されたIDの名前空間が見つかりません`);
        }
      }
    } else {
      console.error('❌ KV Storage権限: 不足しています');
      console.error(`エラー: ${kvData.errors[0]?.message || 'Unknown error'}`);
    }

    // D1データベースリストの取得（D1権限のテスト）
    const d1Response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database`,
      {
        headers: {
          Authorization: `Bearer ${CF_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const d1Data = await d1Response.json();

    if (d1Data.success) {
      console.log('✅ D1 Database権限: 正常');
      console.log(`📊 D1データベースの数: ${d1Data.result.length}`);

      // D1_DATABASE_IDが実際のD1データベースに存在するか確認
      const dbId = process.env.D1_DATABASE_ID;
      if (dbId) {
        const database = d1Data.result.find((db) => db.uuid === dbId);
        if (database) {
          console.log(`✅ D1_DATABASE_ID (${database.name}): 有効`);
        } else {
          console.warn(`⚠️ D1_DATABASE_ID: 指定されたIDのデータベースが見つかりません`);
        }
      }
    } else {
      console.error('❌ D1 Database権限: 不足しています');
      console.error(`エラー: ${d1Data.errors[0]?.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ Cloudflare API検証中にエラーが発生しました:', error.message);
    process.exit(1);
  }
}

console.log('\n✅ 検証完了');
