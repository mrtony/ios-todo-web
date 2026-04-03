import { describe, expect, it } from 'vitest';
import { getDb } from '../src/db/connection.js';

describe('Database Schema', () => {
  it('should create all tables', async () => {
    const db = getDb();
    const result = await db.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);

    const tableNames = result.rows.map((row: any) => row.table_name);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('lists');
    expect(tableNames).toContain('tasks');
    expect(tableNames).toContain('tags');
    expect(tableNames).toContain('task_tags');
  });

  it('should enforce foreign keys', async () => {
    const db = getDb();
    await expect(
      db.query("INSERT INTO lists (id, user_id, name) VALUES ('l1', 'nonexistent', 'Test')"),
    ).rejects.toThrow();
  });

  it('should enforce priority check constraint', async () => {
    const db = getDb();
    await db.query('INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)', [
      'u1',
      'a@b.com',
      'hash',
      'A',
    ]);
    await db.query('INSERT INTO lists (id, user_id, name) VALUES ($1, $2, $3)', ['l1', 'u1', 'My List']);

    await expect(
      db.query('INSERT INTO tasks (id, list_id, title, priority) VALUES ($1, $2, $3, $4)', ['t1', 'l1', 'Task', 5]),
    ).rejects.toThrow();
  });

  it('should cascade delete lists when user is deleted', async () => {
    const db = getDb();
    await db.query('INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)', [
      'u1',
      'a@b.com',
      'hash',
      'A',
    ]);
    await db.query('INSERT INTO lists (id, user_id, name) VALUES ($1, $2, $3)', ['l1', 'u1', 'My List']);
    await db.query('DELETE FROM users WHERE id = $1', ['u1']);

    const result = await db.query('SELECT * FROM lists WHERE id = $1', ['l1']);
    expect(result.rows[0]).toBeUndefined();
  });

  it('should cascade delete tasks when list is deleted', async () => {
    const db = getDb();
    await db.query('INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)', [
      'u1',
      'a@b.com',
      'hash',
      'A',
    ]);
    await db.query('INSERT INTO lists (id, user_id, name) VALUES ($1, $2, $3)', ['l1', 'u1', 'My List']);
    await db.query('INSERT INTO tasks (id, list_id, title) VALUES ($1, $2, $3)', ['t1', 'l1', 'Task 1']);
    await db.query('DELETE FROM lists WHERE id = $1', ['l1']);

    const result = await db.query('SELECT * FROM tasks WHERE id = $1', ['t1']);
    expect(result.rows[0]).toBeUndefined();
  });
});
