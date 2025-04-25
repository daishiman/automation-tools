import { describe, it, expect } from 'vitest';

/**
 * セットアップファイルなしで実行するテスト
 */
describe('セットアップなしテスト', () => {
  it('シンプルな検証', () => {
    console.log('セットアップファイルなしでテスト実行中...');
    expect(1 + 1).toBe(2);
  });

  it('非同期処理のテスト', async () => {
    console.log('非同期テスト開始');

    // 短い遅延（500ms）
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log('非同期テスト完了');
    expect(true).toBe(true);
  });
});
