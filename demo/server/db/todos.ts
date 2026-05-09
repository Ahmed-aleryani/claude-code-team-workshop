import { randomUUID } from 'node:crypto';
import type { ListTodosQuery, SortOption, Todo } from '../../shared/types.js';
import type { DB } from './connection.js';
import { NotFoundError } from './errors.js';

interface TodoRow {
  id: string;
  user_id: string;
  title: string;
  completed: number;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}

const TODO_COLUMNS =
  'id, user_id, title, completed, due_at, created_at, updated_at';

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    completed: row.completed === 1,
    dueAt: row.due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function orderByClause(sort: SortOption | undefined): string {
  if (sort === 'dueAt-asc') {
    return 'ORDER BY due_at IS NULL, due_at ASC, created_at DESC, id DESC';
  }
  return 'ORDER BY created_at DESC, id DESC';
}

export function listTodos(
  db: DB,
  userId: string,
  query: ListTodosQuery = {},
): Todo[] {
  const where: string[] = ['user_id = @userId'];
  const params: Record<string, unknown> = { userId };

  if (query.from !== undefined) {
    where.push('due_at >= @from');
    params.from = query.from;
  }
  if (query.to !== undefined) {
    where.push('due_at < @to');
    params.to = query.to;
  }
  if (query.from !== undefined || query.to !== undefined) {
    where.push('due_at IS NOT NULL');
  }

  const sql = `SELECT ${TODO_COLUMNS}
     FROM todos
     WHERE ${where.join(' AND ')}
     ${orderByClause(query.sort)}`;

  const rows = db.prepare(sql).all(params) as TodoRow[];
  return rows.map(rowToTodo);
}

export interface CreateTodoInput {
  userId: string;
  title: string;
  dueAt?: string | null;
}

export function createTodo(db: DB, input: CreateTodoInput): Todo {
  const id = randomUUID();
  const stmt = db.prepare(
    `INSERT INTO todos (id, user_id, title, due_at)
     VALUES (@id, @userId, @title, @dueAt)
     RETURNING ${TODO_COLUMNS}`,
  );
  const row = stmt.get({
    id,
    userId: input.userId,
    title: input.title,
    dueAt: input.dueAt ?? null,
  }) as TodoRow | undefined;
  if (!row) {
    throw new Error('Failed to insert todo');
  }
  return rowToTodo(row);
}

export interface UpdateTodoInput {
  id: string;
  userId: string;
  patch: {
    title?: string;
    completed?: boolean;
    dueAt?: string | null;
  };
}

export function updateTodo(db: DB, input: UpdateTodoInput): Todo {
  const hasDueAt = 'dueAt' in input.patch;
  if (
    input.patch.title === undefined &&
    input.patch.completed === undefined &&
    !hasDueAt
  ) {
    throw new Error('updateTodo called with empty patch');
  }

  const sets: string[] = [];
  const params: Record<string, unknown> = {
    id: input.id,
    userId: input.userId,
  };

  if (input.patch.title !== undefined) {
    sets.push('title = @title');
    params.title = input.patch.title;
  }
  if (input.patch.completed !== undefined) {
    sets.push('completed = @completed');
    params.completed = input.patch.completed ? 1 : 0;
  }
  if (hasDueAt) {
    sets.push('due_at = @dueAt');
    params.dueAt = input.patch.dueAt ?? null;
  }
  sets.push("updated_at = datetime('now')");

  const stmt = db.prepare(
    `UPDATE todos SET ${sets.join(', ')}
     WHERE id = @id AND user_id = @userId
     RETURNING ${TODO_COLUMNS}`,
  );
  const row = stmt.get(params) as TodoRow | undefined;
  if (!row) {
    throw new NotFoundError('Todo not found');
  }
  return rowToTodo(row);
}

export interface DeleteTodoInput {
  id: string;
  userId: string;
}

export function deleteTodo(db: DB, input: DeleteTodoInput): void {
  const stmt = db.prepare(
    `DELETE FROM todos WHERE id = @id AND user_id = @userId`,
  );
  const result = stmt.run({ id: input.id, userId: input.userId });
  if (result.changes !== 1) {
    throw new NotFoundError('Todo not found');
  }
}
