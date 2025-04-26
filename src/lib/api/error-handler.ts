import { NextResponse } from 'next/server';
import { ValidationError, AuthError, NotFoundError, ServiceError } from '../errors/app-error';

/**
 * API エラーハンドラー
 * 各種エラーを適切なHTTPレスポンスに変換する
 * @param error 発生したエラー
 * @returns 適切なステータスコードとエラー情報を含むレスポンス
 */
export function handleApiError(error: unknown): NextResponse {
  // 開発環境でのみログを出力（本番環境では構造化ロギングを使用すべき）
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('API Error:', error);
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: 400 }
    );
  }

  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: 401 }
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: 404 }
    );
  }

  if (error instanceof ServiceError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: 500 }
    );
  }

  // 未知のエラー
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'サーバーエラーが発生しました',
      },
    },
    { status: 500 }
  );
}
