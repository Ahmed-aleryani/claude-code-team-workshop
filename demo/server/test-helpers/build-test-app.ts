// Importing this side-effect-free module is harmless, but make sure
// './env.js' is the FIRST import in every test file that uses these helpers,
// so JWT_SECRET is set before server modules are evaluated.
import request, { type Agent } from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { openDb, type DB } from '../db/connection.js';
import { migrate } from '../db/migrate.js';
import type { RegisterInput } from '../../shared/schemas.js';
import type { AuthResponse, User } from '../../shared/types.js';

export interface TestApp {
  app: Express;
  db: DB;
}

export function createTestApp(): TestApp {
  const db = openDb({ path: ':memory:' });
  migrate(db);
  const app = createApp(db);
  return { app, db };
}

export function freshAgent(app: Express): Agent {
  return request.agent(app);
}

const DEFAULT_REGISTER: RegisterInput = {
  email: 'tester@example.com',
  password: 'password123',
};

export async function registerAndLogin(
  agent: Agent,
  overrides: Partial<RegisterInput> = {},
): Promise<{ user: User }> {
  const payload: RegisterInput = { ...DEFAULT_REGISTER, ...overrides };
  const res = await agent
    .post('/api/auth/register')
    .send(payload)
    .set('Content-Type', 'application/json');
  if (res.status !== 201) {
    throw new Error(
      `registerAndLogin failed: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  const body = res.body as AuthResponse;
  return { user: body.user };
}
