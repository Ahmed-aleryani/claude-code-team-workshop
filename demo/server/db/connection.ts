import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type DB = Database.Database;

export interface OpenDbOptions {
  path?: string;
}

export function openDb(options: OpenDbOptions = {}): DB {
  const path = options.path ?? process.env.DB_PATH ?? 'data/app.db';

  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}
