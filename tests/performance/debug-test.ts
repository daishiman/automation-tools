import { describe, it, expect } from 'vitest';

describe('デバッグテスト', () => {
  it('正常に実行できるかテスト', () => {
    console.log('デバッグテスト実行中...');
    expect(true).toBe(true);
  });
});
