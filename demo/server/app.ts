import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import type { DB } from './db/connection.js';
import { errorHandler } from './middleware/error-handler.js';
import { createAuthRouter } from './routes/auth.js';
import { createTodosRouter } from './routes/todos.js';

export function createApp(db: DB): Express {
  const app = express();

  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/todos', createTodosRouter(db));

  app.use(errorHandler);

  return app;
}
