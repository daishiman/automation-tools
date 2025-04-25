import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';

// モック
vi.mock('fs');
vi.mock('path');
vi.mock('child_process');

// migrate.jsの機能を再実装した関数
function runMigration(migrationsDir: string, dbName: string) {
  // SQLファイルを取得
  const sqlFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => typeof file === 'string' && file.endsWith('.sql'))
    .sort();

  if (sqlFiles.length === 0) {
    // eslint-disable-next-line no-console
    console.error(
      '❌ マイグレーションファイルが見つかりません。まず `pnpm drizzle-kit generate` を実行してください。'
    );
    process.exit(1);
    return; // テスト用に追加
  }

  // eslint-disable-next-line no-console
  console.log(`🔍 ${sqlFiles.length}個のマイグレーションファイルを実行します...`);

  // 各マイグレーションファイルを実行
  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDir, file);
    // eslint-disable-next-line no-console
    console.log(`⚙️ マイグレーションを実行中: ${file}`);

    try {
      // wranglerコマンドを実行
      childProcess.execSync(`pnpm wrangler d1 execute ${dbName} --file=${filePath}`, {
        stdio: 'inherit',
      });
      // eslint-disable-next-line no-console
      console.log(`✅ マイグレーション成功: ${file}`);
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error(`❌ マイグレーション失敗: ${file}`);
      if (error instanceof Error) {
        // eslint-disable-next-line no-console
        console.error(error.message);
      }
      process.exit(1);
      return; // テスト用に追加
    }
  }

  // eslint-disable-next-line no-console
  console.log('🎉 すべてのマイグレーションが正常に実行されました！');
}

describe('Migration Scripts', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('migrate.js', () => {
    it('マイグレーションファイルが見つからない場合はエラーを出力して終了すべき', () => {
      // ファイルが存在しない場合のモック
      vi.mocked(fs.readdirSync).mockReturnValue([]);
      vi.mocked(path.resolve).mockReturnValue('/fake/path');

      // プロセス終了をモック
      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => {}) as unknown as (code?: number) => never);

      // consoleをモック
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      // マイグレーションスクリプトを実行
      runMigration('/fake/path', 'test-db');

      // 検証
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('マイグレーションファイルが見つかりません')
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('マイグレーションファイルが存在する場合は各ファイルを順に実行すべき', () => {
      // ファイルが存在する場合のモック
      vi.mocked(fs.readdirSync).mockReturnValue([
        '001_initial.sql',
        '002_add_tasks.sql',
      ] as unknown as fs.Dirent[]);
      vi.mocked(path.resolve).mockReturnValue('/fake/path');
      vi.mocked(path.join).mockImplementation((...args) => args.join('/'));

      // execSyncをモック
      vi.mocked(childProcess.execSync).mockImplementation(() => Buffer.from('success'));

      // consoleをモック
      const mockConsole = vi.spyOn(console, 'log').mockImplementation(() => {});

      // マイグレーションスクリプトを実行
      runMigration('/fake/path', 'test-db');

      // 検証
      expect(childProcess.execSync).toHaveBeenCalledTimes(2);
      expect(childProcess.execSync).toHaveBeenCalledWith(
        expect.stringContaining('001_initial.sql'),
        expect.anything()
      );
      expect(childProcess.execSync).toHaveBeenCalledWith(
        expect.stringContaining('002_add_tasks.sql'),
        expect.anything()
      );
      expect(mockConsole).toHaveBeenCalledWith(
        expect.stringContaining('すべてのマイグレーションが正常に実行されました')
      );
    });

    it('マイグレーション実行中にエラーが発生した場合は処理を終了すべき', () => {
      // ファイルが存在する場合のモック
      vi.mocked(fs.readdirSync).mockReturnValue([
        '001_initial.sql',
        '002_error.sql',
      ] as unknown as fs.Dirent[]);
      vi.mocked(path.resolve).mockReturnValue('/fake/path');
      vi.mocked(path.join).mockImplementation((...args) => args.join('/'));

      // 最初のファイルは成功、2番目のファイルでエラーを発生させる
      vi.mocked(childProcess.execSync)
        .mockImplementationOnce(() => Buffer.from('success'))
        .mockImplementationOnce(() => {
          throw new Error('Migration failed');
        });

      // consoleをモック
      vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      // プロセス終了をモック
      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => {}) as unknown as (code?: number) => never);

      // マイグレーションスクリプトを実行
      runMigration('/fake/path', 'test-db');

      // 検証
      expect(childProcess.execSync).toHaveBeenCalledTimes(2);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('マイグレーション失敗')
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
