/**
 * パフォーマンスメトリックを追跡するためのヘルパー
 */
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

// グローバル型定義
declare global {
  // すでに定義されている場合は再定義しないよう条件付きで型を定義
  interface Global {
    __PERF_METRICS__: {
      startTime: number;
      endTime: number;
      memory: {
        start: {
          rss: number;
          heapTotal: number;
          heapUsed: number;
          external: number;
          arrayBuffers?: number; // NodeJS.v16以降で追加されたプロパティなのでオプショナルに
        };
        end: {
          rss: number;
          heapTotal: number;
          heapUsed: number;
          external: number;
          arrayBuffers?: number; // NodeJS.v16以降で追加されたプロパティなのでオプショナルに
        };
      };
      metrics: Record<
        string,
        {
          duration: number;
          memory: number;
          samples: number;
          [key: string]: number | unknown;
        }
      >;
    };
  }
}

// メトリックを記録
export function trackMetric(
  name: string,
  metrics: {
    duration: number;
    memory: number;
    totalDuration?: number;
    totalMemory?: number;
    [key: string]: unknown;
  }
) {
  // グローバル変数へのアクセス
  if (!global.__PERF_METRICS__) {
    global.__PERF_METRICS__ = {
      startTime: 0,
      endTime: 0,
      memory: {
        start: {
          rss: 0,
          heapTotal: 0,
          heapUsed: 0,
          external: 0,
          arrayBuffers: 0,
        },
        end: {
          rss: 0,
          heapTotal: 0,
          heapUsed: 0,
          external: 0,
          arrayBuffers: 0,
        },
      },
      metrics: {},
    };
  }

  // メトリック名が存在しない場合は初期化
  if (!global.__PERF_METRICS__.metrics[name]) {
    global.__PERF_METRICS__.metrics[name] = {
      duration: 0,
      memory: 0,
      samples: 0,
    };
  }

  // 既存のメトリックを取得
  const existingMetric = global.__PERF_METRICS__.metrics[name];

  // サンプル数をインクリメント
  existingMetric.samples += 1;

  // 移動平均の計算
  const oldWeight = (existingMetric.samples - 1) / existingMetric.samples;
  const newWeight = 1 / existingMetric.samples;

  // メトリックの更新
  existingMetric.duration = oldWeight * existingMetric.duration + newWeight * metrics.duration;
  existingMetric.memory = oldWeight * existingMetric.memory + newWeight * metrics.memory;

  // 追加のメトリックがある場合は追加
  Object.entries(metrics).forEach(([key, value]) => {
    if (key !== 'duration' && key !== 'memory' && typeof value === 'number') {
      if (!(key in existingMetric)) {
        (existingMetric as Record<string, number>)[key] = 0;
      }
      (existingMetric as Record<string, number>)[key] =
        oldWeight * (existingMetric as Record<string, number>)[key] + newWeight * value;
    }
  });

  // コンソールへの出力（デバッグ用）
  if (process.env.DEBUG_PERFORMANCE === 'true') {
    // eslint-disable-next-line no-console
    console.log(`Performance [${name}]:`, {
      duration: `${metrics.duration.toFixed(2)}ms`,
      memory: `${metrics.memory.toFixed(2)}MB`,
      samples: existingMetric.samples,
    });
  }

  return existingMetric;
}

// パフォーマンスメトリックをファイルに保存
export function saveMetricsToFile(filePath: string) {
  // ディレクトリが存在しない場合は作成
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // メトリックをJSONとして保存
  fs.writeFileSync(filePath, JSON.stringify(global.__PERF_METRICS__, null, 2));

  // eslint-disable-next-line no-console
  console.log(`Performance metrics saved to: ${filePath}`);
}

// メトリックの計測を開始
export function startMeasurement() {
  return {
    startTime: performance.now(),
    startMemory: process.memoryUsage().heapUsed,
  };
}

// メトリックの計測を終了
export function endMeasurement(start: { startTime: number; startMemory: number }, name: string) {
  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;

  return trackMetric(name, {
    duration: endTime - start.startTime,
    memory: (endMemory - start.startMemory) / 1024 / 1024, // MB
  });
}
