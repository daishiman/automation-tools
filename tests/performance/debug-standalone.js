/**
 * Vitest使わず直接実行可能なパフォーマンステスト
 *
 * 実行方法: node tests/performance/debug-standalone.js
 */

console.log('パフォーマンステスト開始（スタンドアロン）');

// テスト実行用のヘルパー関数
async function runTest(name, testFn) {
  console.log(`テスト実行: ${name}`);
  const startTime = Date.now();

  try {
    await testFn();
    console.log(`✅ テスト成功: ${name} (${Date.now() - startTime}ms)`);
    return true;
  } catch (error) {
    console.error(`❌ テスト失敗: ${name}`, error);
    return false;
  }
}

// モック生成関数
async function generateText(prompt) {
  // 実際の生成をシミュレート
  await new Promise((resolve) => setTimeout(resolve, 100));
  return {
    text: `Generated: ${prompt}`,
    tokens: prompt.length,
    time: 100,
  };
}

// メイン実行関数
async function main() {
  let successCount = 0;
  let failCount = 0;

  // テスト1
  if (
    await runTest('シンプルなテスト', async () => {
      const result = 1 + 1;
      if (result !== 2) throw new Error('1+1は2であるべき');
    })
  )
    successCount++;
  else failCount++;

  // テスト2
  if (
    await runTest('テキスト生成テスト', async () => {
      const prompts = ['短いプロンプト', '中程度の長さのプロンプト'];

      for (const prompt of prompts) {
        const result = await generateText(prompt);
        if (!result.text) throw new Error('テキストが生成されていない');
        console.log(`  生成結果: ${result.text.substring(0, 20)}...`);
      }
    })
  )
    successCount++;
  else failCount++;

  // テスト3
  if (
    await runTest('連続生成テスト', async () => {
      const iterations = 3;
      const results = [];

      for (let i = 0; i < iterations; i++) {
        results.push(await generateText(`テスト${i}`));
      }

      if (results.length !== iterations) {
        throw new Error(`結果数が期待値と一致しない: ${results.length} != ${iterations}`);
      }
    })
  )
    successCount++;
  else failCount++;

  // 結果レポート
  console.log('\n=== テスト結果 ===');
  console.log(`成功: ${successCount}, 失敗: ${failCount}`);
  console.log('==================\n');
}

// スクリプト実行
main().catch((error) => {
  console.error('テスト実行中にエラーが発生しました:', error);
  process.exit(1);
});
