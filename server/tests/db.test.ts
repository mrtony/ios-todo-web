import { describe, expect, it } from 'vitest';
import { getDb } from '../src/db/connection.js';

describe('Database Schema', () => {
  it('should create all tables', () => {
    const db = getDb();
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `).all() as { name: string }[];

    const tableNames = tables.map((table) => table.name);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('lists');
    expect(tableNames).toContain('tasks');
    expect(tableNames).toContain('tags');
    expect(tableNames).toContain('task_tags');
  });

  it('should enforce foreign keys', () => {
    const db = getDb();
    expect(() => {
      db.prepare(`
        INSERT INTO lists (id, user_id, name) VALUES ('l1', 'nonexistent', 'Test')
      `).run();
    }).toThrow();
  });

  it('should enforce priority check constraint', () => {
    const db = getDb();
    const userId = 'u1';
    const listId = 'l1';

    db.prepare(`INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)`)
      .run(userId, 'a@b.com', 'hash', 'A');
    db.prepare(`INSERT INTO lists (id, user_id, name) VALUES (?, ?, ?)`)
      .run(listId, userId, 'My List');

    expect(() => {
      db.prepare(`
        INSERT INTO tasks (id, list_id, title, priority) VALUES ('t1', ?, 'Task', 5)
      `).run(listId);
    }).toThrow();
  });

  it('should cascade delete lists when user is deleted', () => {
    const db = getDb();

    db.prepare(`INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)`)
      .run('u1', 'a@b.com', 'hash', 'A');
    db.prepare(`INSERT INTO lists (id, user_id, name) VALUES (?, ?, ?)`)
      .run('l1', 'u1', 'My List');
    db.prepare(`DELETE FROM users WHERE id = ?`).run('u1');

    const list = db.prepare(`SELECT * FROM lists WHERE id = ?`).get('l1');
    expect(list).toBeUndefined();
  });

  it('should cascade delete tasks when list is deleted', () => {
    const db = getDb();

    db.prepare(`INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)`)
      .run('u1', 'a@b.com', 'hash', 'A');
    db.prepare(`INSERT INTO lists (id, user_id, name) VALUES (?, ?, ?)`)
      .run('l1', 'u1', 'My List');
    db.prepare(`INSERT INTO tasks (id, list_id, title) VALUES (?, ?, ?)`)
      .run('t1', 'l1', 'Task 1');
    db.prepare(`DELETE FROM lists WHERE id = ?`).run('l1');

    const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get('t1');
    expect(task).toBeUndefined();
  });
});
