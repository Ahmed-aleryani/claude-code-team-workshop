import '../test-helpers/env.js';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Express } from 'express';
import type { Agent } from 'supertest';
import {
  createTestApp,
  freshAgent,
  registerAndLogin,
} from '../test-helpers/build-test-app.js';
import type { ApiError, AuthResponse, User } from '../../shared/types.js';

function getSetCookie(headers: Record<string, string | string[] | undefined>): string[] {
  const raw = headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function findCookie(cookies: string[], name: string): string | null {
  for (const c of cookies) {
    if (c.startsWith(`${name}=`)) return c;
  }
  return null;
}

function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.email === 'string' &&
    typeof v.createdAt === 'string'
  );
}

function asAuthResponse(body: unknown): AuthResponse {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Expected object body');
  }
  const b = body as Record<string, unknown>;
  if (!isUser(b.user)) {
    throw new Error(`Expected AuthResponse.user, got ${JSON.stringify(body)}`);
  }
  return { user: b.user };
}

function asApiError(body: unknown): ApiError {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Expected object body');
  }
  const b = body as Record<string, unknown>;
  if (typeof b.error !== 'string') {
    throw new Error(`Expected ApiError.error, got ${JSON.stringify(body)}`);
  }
  const out: ApiError = { error: b.error };
  if (b.details && typeof b.details === 'object') {
    out.details = b.details as Record<string, string[]>;
  }
  return out;
}

describe('POST /api/auth/register', () => {
  let app: Express;
  let agent: Agent;

  beforeEach(() => {
    ({ app } = createTestApp());
    agent = freshAgent(app);
  });

  it('returns 201 with { user } shape and sets auth_token cookie with HttpOnly + SameSite=Lax', async () => {
    const res = await agent
      .post('/api/auth/register')
      .send({ email: 'new@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    const body = asAuthResponse(res.body);
    expect(body.user.email).toBe('new@example.com');
    expect(body.user.id).toMatch(/.+/);
    expect(body.user.createdAt).toMatch(/.+/);

    const cookies = getSetCookie(res.headers);
    const auth = findCookie(cookies, 'auth_token');
    expect(auth).not.toBeNull();
    expect(auth?.toLowerCase()).toContain('httponly');
    expect(auth?.toLowerCase()).toContain('samesite=lax');
  });

  it('returns 409 when the email is already taken', async () => {
    const first = await agent
      .post('/api/auth/register')
      .send({ email: 'dupe@example.com', password: 'password123' });
    expect(first.status).toBe(201);

    const second = await freshAgent(app)
      .post('/api/auth/register')
      .send({ email: 'dupe@example.com', password: 'password123' });

    expect(second.status).toBe(409);
    const err = asApiError(second.body);
    expect(err.error).toMatch(/email/i);
  });

  it('returns 400 with details when password is shorter than 8 chars', async () => {
    const res = await agent
      .post('/api/auth/register')
      .send({ email: 'short@example.com', password: 'short' });

    expect(res.status).toBe(400);
    const err = asApiError(res.body);
    expect(err.error).toMatch(/validation/i);
    expect(err.details).toBeDefined();
    expect(Object.keys(err.details ?? {})).toContain('password');
  });

  it('returns 400 with details when email is malformed', async () => {
    const res = await agent
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
    const err = asApiError(res.body);
    expect(err.error).toMatch(/validation/i);
    expect(err.details).toBeDefined();
    expect(Object.keys(err.details ?? {})).toContain('email');
  });
});

describe('POST /api/auth/login', () => {
  let app: Express;

  beforeEach(async () => {
    ({ app } = createTestApp());
    const setupAgent = freshAgent(app);
    await registerAndLogin(setupAgent, {
      email: 'existing@example.com',
      password: 'password123',
    });
  });

  it('returns 200 + { user } + auth_token cookie when credentials are valid', async () => {
    const res = await freshAgent(app)
      .post('/api/auth/login')
      .send({ email: 'existing@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    const body = asAuthResponse(res.body);
    expect(body.user.email).toBe('existing@example.com');

    const cookies = getSetCookie(res.headers);
    const auth = findCookie(cookies, 'auth_token');
    expect(auth).not.toBeNull();
    expect(auth?.toLowerCase()).toContain('httponly');
    expect(auth?.toLowerCase()).toContain('samesite=lax');
  });

  it('returns 401 when password is wrong', async () => {
    const res = await freshAgent(app)
      .post('/api/auth/login')
      .send({ email: 'existing@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    const err = asApiError(res.body);
    expect(err.error).toMatch(/invalid email or password/i);
  });

  it('returns 401 with the same generic message when the user does not exist', async () => {
    const wrongPwRes = await freshAgent(app)
      .post('/api/auth/login')
      .send({ email: 'existing@example.com', password: 'wrong-password' });
    const noUserRes = await freshAgent(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(noUserRes.status).toBe(401);
    const wrongPwErr = asApiError(wrongPwRes.body);
    const noUserErr = asApiError(noUserRes.body);
    expect(noUserErr.error).toBe(wrongPwErr.error);
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 204 and clears the auth_token cookie', async () => {
    const { app } = createTestApp();
    const agent = freshAgent(app);
    await registerAndLogin(agent, {
      email: 'logout@example.com',
      password: 'password123',
    });

    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(204);

    const cookies = getSetCookie(res.headers);
    const auth = findCookie(cookies, 'auth_token');
    expect(auth).not.toBeNull();
    // A clearing Set-Cookie has an empty value and either Max-Age=0 or an Expires
    // in the past. Express's res.clearCookie sets Expires to the epoch.
    expect(auth?.toLowerCase()).toMatch(/max-age=0|expires=/);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 200 + { user } when authenticated', async () => {
    const { app } = createTestApp();
    const agent = freshAgent(app);
    const { user } = await registerAndLogin(agent, {
      email: 'me@example.com',
      password: 'password123',
    });

    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    const body = asAuthResponse(res.body);
    expect(body.user.email).toBe('me@example.com');
    expect(body.user.id).toBe(user.id);
  });

  it('returns 401 when no cookie is sent', async () => {
    const { app } = createTestApp();
    const res = await freshAgent(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    const err = asApiError(res.body);
    expect(err.error).toMatch(/unauthorized/i);
  });
});
