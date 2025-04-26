import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// MSWモックサーバー
export const server = setupServer(...handlers);
