import type { DB } from './connection.js';

interface ColumnInfo {
  name: string;
}

function hasColumn(db: DB, table: string, column: string): boolean {
  const rows = db.pragma(`table_info(${table})`) as ColumnInfo[];
  return rows.some((row) => row.name === column);
}

export function migrate(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
  `);

  if (!hasColumn(db, 'todos', 'due_at')) {
    db.exec(`ALTER TABLE todos ADD COLUMN due_at TEXT`);
  }
}
