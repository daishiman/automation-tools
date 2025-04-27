import { http, HttpResponse } from 'msw';

// APIエンドポイントモック
export const handlers = [
  // ユーザー関連
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'Test User 1' },
      { id: '2', name: 'Test User 2' },
    ]);
  }),

  http.get('/api/users/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({ id, name: `Test User ${id}` });
  }),

  http.post('/api/users', async ({ request }) => {
    const user = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: '3', ...user }, { status: 201 });
  }),

  // 認証関連
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = (await request.json()) as {
      email: string;
      password: string;
    };
    if (email === 'test@example.com' && password === 'password') {
      return HttpResponse.json({
        token: 'test-token',
        user: { id: '1', name: 'Test User', email },
      });
    }
    return new HttpResponse(null, { status: 401 });
  }),

  // Webhooks
  http.post('/webhooks/event', async () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // AI関連
  http.post('/api/mastra/generate', async () => {
    return HttpResponse.json({
      result: 'Generated content',
      id: 'gen_123',
    });
  }),
];
