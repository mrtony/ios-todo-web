import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | undefined;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/todo.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }

  return db;
}

export function createTestDb(): Database.Database {
  const testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');
  return testDb;
}

export function setDb(newDb: Database.Database): void {
  if (db && db !== newDb) {
    db.close();
  }
  db = newDb;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = undefined;
  }
}
