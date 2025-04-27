/**
 * Vitest依存のないMastraパフォーマンステスト
 *
 * 実行方法:
 * node tests/performance/mastra-performance.js
 */

// 基本的なテスト機能
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
};

// パフォーマンスメトリック追跡
const metrics = {
  startTime: Date.now(),
  endTime: 0,
  memory: {
    start: process.memoryUsage(),
    end: {},
  },
  measurements: {},

  trackMetric(name, data) {
    if (!this.measurements[name]) {
      this.measurements[name] = { duration: 0, memory: 0, samples: 0 };
    }

    const current = this.measurements[name];
    current.samples++;

    // 移動平均の計算
    const oldWeight = (current.samples - 1) / current.samples;
    const newWeight = 1 / current.samples;

    current.duration = oldWeight * current.duration + newWeight * data.duration;
    current.memory = oldWeight * current.memory + newWeight * data.memory;

    if (data.totalDuration) current.totalDuration = data.totalDuration;
    if (data.totalMemory) current.totalMemory = data.totalMemory;

    return current;
  },

  reportResults() {
    this.endTime = Date.now();
    this.memory.end = process.memoryUsage();

    console.log('\n===== パフォーマンステスト結果 =====');
    console.log(`総実行時間: ${this.endTime - this.startTime}ms`);
    console.log(
      `メモリ使用量: ${(this.memory.end.heapUsed - this.memory.start.heapUsed) / 1024 / 1024}MB`
    );

    console.log('\n----- 詳細メトリクス -----');
    Object.entries(this.measurements).forEach(([name, data]) => {
      console.log(`${name}:`);
      console.log(`  平均実行時間: ${data.duration.toFixed(2)}ms`);
      console.log(`  平均メモリ使用量: ${data.memory.toFixed(2)}MB`);
      console.log(`  サンプル数: ${data.samples}`);

      if (data.totalDuration) {
        console.log(`  総実行時間: ${data.totalDuration.toFixed(2)}ms`);
      }
      if (data.totalMemory) {
        console.log(`  総メモリ使用量: ${data.totalMemory.toFixed(2)}MB`);
      }
    });

    console.log('\n=============================');
  },
};

// テキスト生成のモック実装
const generateText = async (prompt) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  // 生成処理のシミュレーション
  await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 100));

  const response = {
    text: `Mastra generated: ${prompt}`,
    tokens: prompt.split(/\s+/).length * 2,
    generationTime: Date.now() - startTime,
  };

  const endTime = Date.now();
  const endMemory = process.memoryUsage().heapUsed;

  // メトリクスを追跡
  const category = prompt.length <= 10 ? 'short' : prompt.length <= 50 ? 'medium' : 'long';
  metrics.trackMetric(`generate_${category}`, {
    duration: endTime - startTime,
    memory: (endMemory - startMemory) / 1024 / 1024,
  });

  return response;
};

// テスト実行のヘルパー関数
async function runTest(name, testFn) {
  console.log(`\n[テスト開始] ${name}`);
  const startTime = Date.now();

  try {
    await testFn();
    const duration = Date.now() - startTime;
    console.log(`✅ [テスト成功] ${name} (${duration}ms)`);
    return true;
  } catch (error) {
    console.error(`❌ [テスト失敗] ${name}:`, error);
    return false;
  }
}

// テストケース
const tests = [
  // テスト1: 異なる長さのプロンプトのパフォーマンス
  async () => {
    const testPrompts = [
      '短いプロンプト',
      '中程度の長さのプロンプトで、少し詳細な情報が含まれています。',
      '長いプロンプトで、多くの詳細情報や指示が含まれています。このようなプロンプトは、AIモデルに対してより複雑な要求をするときに使用されます。生成される応答にも影響を与えるかもしれません。',
    ];

    for (const prompt of testPrompts) {
      const result = await generateText(prompt);

      assert(result.text.includes(prompt), 'テキストが生成されていません');
      assert(result.tokens > 0, 'トークン数が不正です');
      assert(result.generationTime > 0, '生成時間が記録されていません');

      console.log(`  プロンプト[${prompt.length}文字]: ${result.text.substring(0, 30)}...`);
    }
  },

  // テスト2: 連続リクエストのパフォーマンス
  async () => {
    const iterations = 5;
    const samplePrompt = 'これは連続テスト用のプロンプトです';
    const results = [];

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < iterations; i++) {
      const result = await generateText(`${samplePrompt} - ${i}`);
      results.push(result);
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    const totalDuration = endTime - startTime;
    const totalMemory = (endMemory - startMemory) / 1024 / 1024;

    metrics.trackMetric('consecutive_requests', {
      duration: totalDuration / iterations,
      memory: totalMemory / iterations,
      totalDuration,
      totalMemory,
    });

    assert(results.length === iterations, `結果の数が期待値と異なります: ${results.length}`);
    console.log(
      `  ${iterations}回の連続リクエスト完了 (平均: ${(totalDuration / iterations).toFixed(
        2
      )}ms/リクエスト)`
    );
  },

  // テスト3: 並列リクエストのパフォーマンス
  async () => {
    const parallelCount = 3;
    const prompts = Array(parallelCount)
      .fill()
      .map((_, i) => `並列テスト${i}用のプロンプト`);

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const results = await Promise.all(prompts.map((p) => generateText(p)));

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    const totalDuration = endTime - startTime;
    const totalMemory = (endMemory - startMemory) / 1024 / 1024;

    metrics.trackMetric('parallel_requests', {
      duration: totalDuration / parallelCount,
      memory: totalMemory / parallelCount,
      totalDuration,
      totalMemory,
    });

    assert(results.length === parallelCount, '結果の数が不正です');
    console.log(`  ${parallelCount}個の並列リクエスト完了 (合計: ${totalDuration}ms)`);
  },
];

// メイン実行
async function main() {
  console.log('Mastraパフォーマンステスト開始');
  let passed = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    if (await runTest(`テスト ${i + 1}`, tests[i])) {
      passed++;
    } else {
      failed++;
    }
  }

  metrics.reportResults();

  console.log(`\n実行結果: ${passed}成功, ${failed}失敗`);
  return failed === 0;
}

// スクリプト実行
main()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('テスト実行中にエラーが発生しました:', error);
    process.exit(1);
  });
