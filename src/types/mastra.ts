/**
 * Mastraフレームワークのグローバル型定義
 *
 * これらの型はアプリケーション全体でMastraフレームワークと連携するために使用されます。
 * 詳細な型はsrc/mastra/typesに定義されています。
 */

/**
 * AIワークフロー実行結果の型
 */
export interface WorkflowResult<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

/**
 * ワークフローコンテキスト
 */
export interface WorkflowContext {
  userId?: string;
  sessionId?: string;
  locale?: string;
  timezone?: string;
  requestId?: string;
}

/**
 * AIツール実行の設定オプション
 */
export interface AIToolOptions {
  timeout?: number;
  retries?: number;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Mastraサービスの設定
 */
export interface MastraConfig {
  apiKey?: string;
  defaultModel: string;
  baseUrl?: string;
  timeout?: number;
  debug?: boolean;
}

/**
 * アプリケーションでのMastra使用の主要エントリーポイント
 */
export type MastraService = {
  executeWorkflow: <TInput, TOutput>(
    workflowName: string,
    input: TInput,
    context?: WorkflowContext
  ) => Promise<WorkflowResult<TOutput>>;

  invokeTool: <TInput, TOutput>(
    toolName: string,
    params: TInput,
    options?: AIToolOptions
  ) => Promise<TOutput>;
};
