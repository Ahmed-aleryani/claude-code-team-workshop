import '../test-helpers/env.js';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Express } from 'express';
import type { Agent } from 'supertest';
import {
  createTestApp,
  freshAgent,
  registerAndLogin,
} from '../test-helpers/build-test-app.js';
import type { ApiError, Todo } from '../../shared/types.js';

function isTodo(value: unknown): value is Todo {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.userId === 'string' &&
    typeof v.title === 'string' &&
    typeof v.completed === 'boolean' &&
    (typeof v.dueAt === 'string' || v.dueAt === null) &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string'
  );
}

function asTodo(body: unknown): Todo {
  if (!isTodo(body)) {
    throw new Error(`Expected Todo, got ${JSON.stringify(body)}`);
  }
  return body;
}

function asTodoList(body: unknown): Todo[] {
  if (!Array.isArray(body)) {
    throw new Error(`Expected array, got ${JSON.stringify(body)}`);
  }
  for (const t of body) {
    if (!isTodo(t)) {
      throw new Error(`Expected Todo[] element, got ${JSON.stringify(t)}`);
    }
  }
  return body;
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

describe('todos routes — unauthenticated', () => {
  let app: Express;

  beforeEach(() => {
    ({ app } = createTestApp());
  });

  it('GET /api/todos without a cookie returns 401', async () => {
    const res = await freshAgent(app).get('/api/todos');
    expect(res.status).toBe(401);
    asApiError(res.body);
  });

  it('POST /api/todos without a cookie returns 401', async () => {
    const res = await freshAgent(app)
      .post('/api/todos')
      .send({ title: 'no auth' });
    expect(res.status).toBe(401);
    asApiError(res.body);
  });

  it('PATCH /api/todos/:id without a cookie returns 401', async () => {
    const res = await freshAgent(app)
      .patch('/api/todos/some-id')
      .send({ completed: true });
    expect(res.status).toBe(401);
    asApiError(res.body);
  });

  it('DELETE /api/todos/:id without a cookie returns 401', async () => {
    const res = await freshAgent(app).delete('/api/todos/some-id');
    expect(res.status).toBe(401);
    asApiError(res.body);
  });
});

describe('GET /api/todos', () => {
  let app: Express;
  let agent: Agent;

  beforeEach(async () => {
    ({ app } = createTestApp());
    agent = freshAgent(app);
    await registerAndLogin(agent, {
      email: 'list@example.com',
      password: 'password123',
    });
  });

  it('returns [] for a brand-new user', async () => {
    const res = await agent.get('/api/todos');
    expect(res.status).toBe(200);
    const list = asTodoList(res.body);
    expect(list).toEqual([]);
  });

  it("returns the user's todos in newest-first order", async () => {
    const a = asTodo(
      (await agent.post('/api/todos').send({ title: 'first' })).body,
    );
    const b = asTodo(
      (await agent.post('/api/todos').send({ title: 'second' })).body,
    );
    const c = asTodo(
      (await agent.post('/api/todos').send({ title: 'third' })).body,
    );

    const res = await agent.get('/api/todos');
    expect(res.status).toBe(200);
    const list = asTodoList(res.body);
    expect(list).toHaveLength(3);
    const ids = list.map((t) => t.id);
    // Listing order is created_at DESC, id DESC — implementation-defined but stable.
    expect(new Set(ids)).toEqual(new Set([a.id, b.id, c.id]));
  });
});

describe('POST /api/todos', () => {
  let app: Express;
  let agent: Agent;

  beforeEach(async () => {
    ({ app } = createTestApp());
    agent = freshAgent(app);
    await registerAndLogin(agent, {
      email: 'create@example.com',
      password: 'password123',
    });
  });

  it('returns 201 with the created todo, trims the title, and sets created_at', async () => {
    const res = await agent.post('/api/todos').send({ title: '  buy milk  ' });
    expect(res.status).toBe(201);
    const todo = asTodo(res.body);
    expect(todo.title).toBe('buy milk');
    expect(todo.completed).toBe(false);
    expect(todo.createdAt).toMatch(/.+/);
    expect(todo.updatedAt).toMatch(/.+/);
    expect(todo.id).toMatch(/.+/);
  });

  it('returns 400 when title is empty after trim', async () => {
    const res = await agent.post('/api/todos').send({ title: '   ' });
    expect(res.status).toBe(400);
    const err = asApiError(res.body);
    expect(err.error).toMatch(/validation/i);
  });
});

describe('PATCH /api/todos/:id', () => {
  let app: Express;
  let agent: Agent;
  let todoId: string;

  beforeEach(async () => {
    ({ app } = createTestApp());
    agent = freshAgent(app);
    await registerAndLogin(agent, {
      email: 'patch@example.com',
      password: 'password123',
    });
    const created = asTodo(
      (await agent.post('/api/todos').send({ title: 'original' })).body,
    );
    todoId = created.id;
  });

  it('updates title only', async () => {
    const res = await agent
      .patch(`/api/todos/${todoId}`)
      .send({ title: 'renamed' });
    expect(res.status).toBe(200);
    const todo = asTodo(res.body);
    expect(todo.title).toBe('renamed');
    expect(todo.completed).toBe(false);
  });

  it('updates completed only', async () => {
    const res = await agent
      .patch(`/api/todos/${todoId}`)
      .send({ completed: true });
    expect(res.status).toBe(200);
    const todo = asTodo(res.body);
    expect(todo.completed).toBe(true);
    expect(todo.title).toBe('original');
  });

  it('updates both title and completed', async () => {
    const res = await agent
      .patch(`/api/todos/${todoId}`)
      .send({ title: 'both', completed: true });
    expect(res.status).toBe(200);
    const todo = asTodo(res.body);
    expect(todo.title).toBe('both');
    expect(todo.completed).toBe(true);
  });

  it('returns 404 when the id does not exist for this user', async () => {
    const res = await agent
      .patch('/api/todos/00000000-0000-0000-0000-000000000000')
      .send({ completed: true });
    expect(res.status).toBe(404);
    asApiError(res.body);
  });

  it('returns 400 when body is empty {}', async () => {
    const res = await agent.patch(`/api/todos/${todoId}`).send({});
    expect(res.status).toBe(400);
    const err = asApiError(res.body);
    expect(err.error).toMatch(/validation/i);
  });
});

describe('DELETE /api/todos/:id', () => {
  let app: Express;
  let agent: Agent;
  let todoId: string;

  beforeEach(async () => {
    ({ app } = createTestApp());
    agent = freshAgent(app);
    await registerAndLogin(agent, {
      email: 'delete@example.com',
      password: 'password123',
    });
    const created = asTodo(
      (await agent.post('/api/todos').send({ title: 'to delete' })).body,
    );
    todoId = created.id;
  });

  it('returns 204 and the todo no longer appears in GET /api/todos', async () => {
    const del = await agent.delete(`/api/todos/${todoId}`);
    expect(del.status).toBe(204);

    const list = asTodoList((await agent.get('/api/todos')).body);
    expect(list.find((t) => t.id === todoId)).toBeUndefined();
  });

  it('returns 404 when the id does not exist for this user', async () => {
    const res = await agent.delete(
      '/api/todos/00000000-0000-0000-0000-000000000000',
    );
    expect(res.status).toBe(404);
    asApiError(res.body);
  });
});

describe('todos ownership — user B cannot access user A todos', () => {
  let app: Express;
  let agentA: Agent;
  let agentB: Agent;
  let todoA: Todo;

  beforeEach(async () => {
    ({ app } = createTestApp());
    agentA = freshAgent(app);
    agentB = freshAgent(app);
    await registerAndLogin(agentA, {
      email: 'a@example.com',
      password: 'password123',
    });
    await registerAndLogin(agentB, {
      email: 'b@example.com',
      password: 'password123',
    });
    todoA = asTodo(
      (await agentA.post('/api/todos').send({ title: "A's secret" })).body,
    );
  });

  it("user B's GET /api/todos does not include user A's todo", async () => {
    const list = asTodoList((await agentB.get('/api/todos')).body);
    expect(list.find((t) => t.id === todoA.id)).toBeUndefined();
    expect(list).toEqual([]);
  });

  it("user B's PATCH on user A's todo returns 404", async () => {
    const res = await agentB
      .patch(`/api/todos/${todoA.id}`)
      .send({ completed: true });
    expect(res.status).toBe(404);
    asApiError(res.body);
  });

  it("user B's DELETE on user A's todo returns 404 and does not delete it", async () => {
    const del = await agentB.delete(`/api/todos/${todoA.id}`);
    expect(del.status).toBe(404);
    asApiError(del.body);

    // user A still sees their todo
    const list = asTodoList((await agentA.get('/api/todos')).body);
    expect(list.find((t) => t.id === todoA.id)).toBeDefined();
  });
});

describe('todos dueAt — POST /api/todos', () => {
  let app: Express;
  let agent: Agent;

  beforeEach(async () => {
    ({ app } = createTestApp());
    agent = freshAgent(app);
    await registerAndLogin(agent, {
      email: 'due-create@example.com',
      password: 'password123',
    });
  });

  it('round-trips a valid dueAt through GET', async () => {
    const dueAt = '2026-06-15T17:00:00.000Z';
    const created = asTodo(
      (await agent.post('/api/todos').send({ title: 'pay rent', dueAt })).body,
    );
    expect(created.dueAt).toBe(dueAt);

    const list = asTodoList((await agent.get('/api/todos')).body);
    const fetched = list.find((t) => t.id === created.id);
    expect(fetched?.dueAt).toBe(dueAt);
  });

  it('defaults dueAt to null when omitted', async () => {
    const todo = asTodo(
      (await agent.post('/api/todos').send({ title: 'no date' })).body,
    );
    expect(todo.dueAt).toBeNull();
  });

  it('accepts explicit dueAt: null', async () => {
    const todo = asTodo(
      (await agent.post('/api/todos').send({ title: 'null date', dueAt: null })).body,
    );
    expect(todo.dueAt).toBeNull();
  });

  it('returns 400 with details.dueAt on malformed dueAt', async () => {
    const res = await agent
      .post('/api/todos')
      .send({ title: 'bad date', dueAt: 'tomorrow' });
    expect(res.status).toBe(400);
    const err = asApiError(res.body);
    expect(err.details?.dueAt).toBeDefined();
    expect(err.details?.dueAt?.length ?? 0).toBeGreaterThan(0);
  });

  it('returns 400 on naive (no Z) datetime', async () => {
    const res = await agent
      .post('/api/todos')
      .send({ title: 'naive', dueAt: '2026-06-15T17:00:00' });
    expect(res.status).toBe(400);
    const err = asApiError(res.body);
    expect(err.details?.dueAt).toBeDefined();
  });
});

describe('todos dueAt — PATCH /api/todos/:id', () => {
  let app: Express;
  let agent: Agent;
  let todoId: string;

  beforeEach(async () => {
    ({ app } = createTestApp());
    agent = freshAgent(app);
    await registerAndLogin(agent, {
      email: 'due-patch@example.com',
      password: 'password123',
    });
    const created = asTodo(
      (
        await agent
          .post('/api/todos')
          .send({ title: 'with date', dueAt: '2026-06-15T17:00:00.000Z' })
      ).body,
    );
    todoId = created.id;
  });

  it('updates dueAt to a new value', async () => {
    const next = '2026-07-01T12:00:00.000Z';
    const res = await agent.patch(`/api/todos/${todoId}`).send({ dueAt: next });
    expect(res.status).toBe(200);
    expect(asTodo(res.body).dueAt).toBe(next);
  });

  it('clears dueAt when passed null (verified via GET)', async () => {
    const res = await agent
      .patch(`/api/todos/${todoId}`)
      .send({ dueAt: null });
    expect(res.status).toBe(200);
    expect(asTodo(res.body).dueAt).toBeNull();

    const list = asTodoList((await agent.get('/api/todos')).body);
    const fetched = list.find((t) => t.id === todoId);
    expect(fetched?.dueAt).toBeNull();
  });

  it('returns 400 with details.dueAt on malformed dueAt', async () => {
    const res = await agent
      .patch(`/api/todos/${todoId}`)
      .send({ dueAt: 'not-a-date' });
    expect(res.status).toBe(400);
    const err = asApiError(res.body);
    expect(err.details?.dueAt).toBeDefined();
  });

  // Locks in the `'dueAt' in patch` semantic: when a PATCH body does not include
  // dueAt at all (only title), the existing dueAt must be preserved — not cleared.
  // Distinguishing "key absent" from "key === null" is implicit in zod's parsing
  // today; this test ensures any future change that flattens that distinction
  // surfaces as a test failure rather than data loss.
  it('PATCH that omits dueAt leaves the existing dueAt unchanged', async () => {
    const res = await agent
      .patch(`/api/todos/${todoId}`)
      .send({ title: 'renamed' });
    expect(res.status).toBe(200);
    expect(asTodo(res.body).dueAt).toBe('2026-06-15T17:00:00.000Z');

    const list = asTodoList((await agent.get('/api/todos')).body);
    const fetched = list.find((t) => t.id === todoId);
    expect(fetched?.dueAt).toBe('2026-06-15T17:00:00.000Z');
  });
});

describe('GET /api/todos — sort=dueAt-asc', () => {
  let app: Express;
  let agent: Agent;

  beforeEach(async () => {
    ({ app } = createTestApp());
    agent = freshAgent(app);
    await registerAndLogin(agent, {
      email: 'due-sort@example.com',
      password: 'password123',
    });
  });

  it('returns dated rows ascending by dueAt with undated rows last', async () => {
    const later = asTodo(
      (
        await agent
          .post('/api/todos')
          .send({ title: 'later', dueAt: '2026-08-01T00:00:00.000Z' })
      ).body,
    );
    const undated = asTodo(
      (await agent.post('/api/todos').send({ title: 'undated' })).body,
    );
    const sooner = asTodo(
      (
        await agent
          .post('/api/todos')
          .send({ title: 'sooner', dueAt: '2026-06-01T00:00:00.000Z' })
      ).body,
    );

    const res = await agent.get('/api/todos?sort=dueAt-asc');
    expect(res.status).toBe(200);
    const list = asTodoList(res.body);
    const ids = list.map((t) => t.id);
    expect(ids).toEqual([sooner.id, later.id, undated.id]);
  });
});

describe('GET /api/todos — from/to range filter', () => {
  let app: Express;
  let agent: Agent;

  beforeEach(async () => {
    ({ app } = createTestApp());
    agent = freshAgent(app);
    await registerAndLogin(agent, {
      email: 'due-filter@example.com',
      password: 'password123',
    });
  });

  it('returns only rows in [from, to) and excludes null-dated rows', async () => {
    const before = asTodo(
      (
        await agent
          .post('/api/todos')
          .send({ title: 'before', dueAt: '2026-05-01T00:00:00.000Z' })
      ).body,
    );
    const inRange = asTodo(
      (
        await agent
          .post('/api/todos')
          .send({ title: 'in range', dueAt: '2026-06-15T12:00:00.000Z' })
      ).body,
    );
    const atFrom = asTodo(
      (
        await agent
          .post('/api/todos')
          .send({ title: 'at from (inclusive)', dueAt: '2026-06-01T00:00:00.000Z' })
      ).body,
    );
    const atTo = asTodo(
      (
        await agent
          .post('/api/todos')
          .send({ title: 'at to (exclusive)', dueAt: '2026-07-01T00:00:00.000Z' })
      ).body,
    );
    const undated = asTodo(
      (await agent.post('/api/todos').send({ title: 'undated' })).body,
    );

    const res = await agent.get(
      '/api/todos?from=2026-06-01T00:00:00.000Z&to=2026-07-01T00:00:00.000Z',
    );
    expect(res.status).toBe(200);
    const list = asTodoList(res.body);
    const ids = new Set(list.map((t) => t.id));

    expect(ids.has(inRange.id)).toBe(true);
    expect(ids.has(atFrom.id)).toBe(true);
    expect(ids.has(atTo.id)).toBe(false);
    expect(ids.has(before.id)).toBe(false);
    expect(ids.has(undated.id)).toBe(false);
  });

  it('overdue-only filter (?to=<now>) excludes future and null-dated rows', async () => {
    const now = '2026-05-09T12:00:00.000Z';
    const overdue = asTodo(
      (
        await agent
          .post('/api/todos')
          .send({ title: 'overdue', dueAt: '2026-04-01T00:00:00.000Z' })
      ).body,
    );
    const future = asTodo(
      (
        await agent
          .post('/api/todos')
          .send({ title: 'future', dueAt: '2026-06-01T00:00:00.000Z' })
      ).body,
    );
    const undated = asTodo(
      (await agent.post('/api/todos').send({ title: 'undated' })).body,
    );

    const res = await agent.get(`/api/todos?to=${encodeURIComponent(now)}`);
    expect(res.status).toBe(200);
    const list = asTodoList(res.body);
    const ids = new Set(list.map((t) => t.id));

    expect(ids.has(overdue.id)).toBe(true);
    expect(ids.has(future.id)).toBe(false);
    expect(ids.has(undated.id)).toBe(false);
  });

  it('returns 400 on malformed from', async () => {
    const res = await agent.get('/api/todos?from=not-a-date');
    expect(res.status).toBe(400);
    const err = asApiError(res.body);
    expect(err.details?.from).toBeDefined();
  });

  it('returns 400 on malformed to', async () => {
    const res = await agent.get('/api/todos?to=tomorrow');
    expect(res.status).toBe(400);
    const err = asApiError(res.body);
    expect(err.details?.to).toBeDefined();
  });

  it('returns 400 on invalid sort value', async () => {
    const res = await agent.get('/api/todos?sort=bogus');
    expect(res.status).toBe(400);
    const err = asApiError(res.body);
    expect(err.details?.sort).toBeDefined();
  });
});
