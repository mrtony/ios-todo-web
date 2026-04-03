import type { DbClient } from './connection.js';

export async function initializeSchema(db: DbClient): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      icon TEXT NOT NULL DEFAULT 'list',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, name)
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_lists_user_sort ON lists(user_id, sort_order)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      completed_at TIMESTAMPTZ,
      flagged INTEGER NOT NULL DEFAULT 0,
      due_date TIMESTAMPTZ,
      priority INTEGER NOT NULL DEFAULT 0 CHECK(priority BETWEEN 0 AND 3),
      recurrence TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query('CREATE INDEX IF NOT EXISTS idx_tasks_list_sort ON tasks(list_id, sort_order)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_tasks_list_completed_due ON tasks(list_id, completed_at, due_date)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)');

  await db.query(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6b7280',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, name)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY(task_id, tag_id)
    )
  `);

  await db.query('CREATE INDEX IF NOT EXISTS idx_task_tags_reverse ON task_tags(tag_id, task_id)');
}
