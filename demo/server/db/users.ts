import { randomUUID } from 'node:crypto';
import type { User } from '../../shared/types.js';
import type { DB } from './connection.js';
import { ConflictError } from './errors.js';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
  };
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

export function createUser(db: DB, input: CreateUserInput): User {
  const id = randomUUID();
  const stmt = db.prepare(
    `INSERT INTO users (id, email, password_hash) VALUES (@id, @email, @passwordHash)
     RETURNING id, email, password_hash, created_at`,
  );

  try {
    const row = stmt.get({
      id,
      email: input.email,
      passwordHash: input.passwordHash,
    }) as UserRow | undefined;
    if (!row) {
      throw new Error('Failed to insert user');
    }
    return rowToUser(row);
  } catch (err) {
    if (err instanceof Error && /UNIQUE constraint failed/i.test(err.message)) {
      throw new ConflictError('Email already in use');
    }
    throw err;
  }
}

export function findUserByEmailWithHash(
  db: DB,
  email: string,
): (User & { passwordHash: string }) | null {
  const stmt = db.prepare(
    `SELECT id, email, password_hash, created_at FROM users WHERE email = @email`,
  );
  const row = stmt.get({ email }) as UserRow | undefined;
  if (!row) return null;
  return { ...rowToUser(row), passwordHash: row.password_hash };
}

export function findUserById(db: DB, id: string): User | null {
  const stmt = db.prepare(
    `SELECT id, email, password_hash, created_at FROM users WHERE id = @id`,
  );
  const row = stmt.get({ id }) as UserRow | undefined;
  if (!row) return null;
  return rowToUser(row);
}
