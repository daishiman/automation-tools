export class UserNotFoundError extends Error {
  constructor(userId?: string) {
    const message = userId ? `ID: ${userId}のユーザーが見つかりません` : 'ユーザーが見つかりません';
    super(message);
    this.name = 'UserNotFoundError';
  }
}
