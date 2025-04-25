import '@testing-library/jest-dom';
import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// CI環境かどうかの検出
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

// テスト環境のグローバル設定
beforeAll(() => {
  // CIで実行する場合はタイムアウトとフェイクタイマーを調整
  if (isCI) {
    console.log('CI環境でテストを実行中: パフォーマンス最適化を適用');
    vi.useFakeTimers();
  }

  // グローバルなモックや設定をここに記述
  // テスト固有のモックは各テストファイル内で設定すること
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // コンソールエラーをキャプチャしてテスト中の問題を特定
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // React Testing Libraryの内部エラーは無視（必要に応じてカスタマイズ）
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') || args[0].includes('act(...)'))
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});

// 各テスト後のクリーンアップ
afterEach(() => {
  cleanup();

  // フェイクタイマーをリセット（使用している場合）
  if (vi.isFakeTimers()) {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  }
});

// 全テスト終了後
afterAll(() => {
  // グローバルなクリーンアップ
  if (isCI) {
    vi.useRealTimers();
  }
});
