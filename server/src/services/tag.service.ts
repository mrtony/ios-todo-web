import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error-handler.js';
import type { Tag } from '../types.js';

export function getAll(userId: string): Tag[] {
  const db = getDb();
  return db.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC').all(userId) as Tag[];
}

export function create(userId: string, data: { name: string; color?: string }): Tag {
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO tags (id, user_id, name, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, data.name, data.color || '#6b7280', now, now);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      throw new AppError(409, 'CONFLICT', 'A tag with this name already exists');
    }
    throw err;
  }

  return db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag;
}

export function update(userId: string, tagId: string, data: { name?: string; color?: string }): Tag {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(tagId, userId) as Tag | undefined;
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Tag not found');
  }

  const now = new Date().toISOString();
  try {
    db.prepare('UPDATE tags SET name = ?, color = ?, updated_at = ? WHERE id = ?').run(
      data.name ?? existing.name,
      data.color ?? existing.color,
      now,
      tagId,
    );
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      throw new AppError(409, 'CONFLICT', 'A tag with this name already exists');
    }
    throw err;
  }

  return db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId) as Tag;
}

export function remove(userId: string, tagId: string): void {
  const db = getDb();
  const result = db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(tagId, userId);
  if (result.changes === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Tag not found');
  }
}

export function addTagToTask(userId: string, taskId: string, tagId: string): void {
  const db = getDb();

  const task = db.prepare(`
    SELECT t.id FROM tasks t JOIN lists l ON t.list_id = l.id WHERE t.id = ? AND l.user_id = ?
  `).get(taskId, userId);
  if (!task) {
    throw new AppError(404, 'NOT_FOUND', 'Task not found');
  }

  const tag = db.prepare('SELECT id FROM tags WHERE id = ? AND user_id = ?').get(tagId, userId);
  if (!tag) {
    throw new AppError(404, 'NOT_FOUND', 'Tag not found');
  }

  try {
    db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(taskId, tagId);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint') || err.message?.includes('PRIMARY KEY')) {
      throw new AppError(409, 'CONFLICT', 'Tag already assigned to this task');
    }
    throw err;
  }
}

export function removeTagFromTask(userId: string, taskId: string, tagId: string): void {
  const db = getDb();

  const task = db.prepare(`
    SELECT t.id FROM tasks t JOIN lists l ON t.list_id = l.id WHERE t.id = ? AND l.user_id = ?
  `).get(taskId, userId);
  if (!task) {
    throw new AppError(404, 'NOT_FOUND', 'Task not found');
  }

  const result = db.prepare('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?').run(taskId, tagId);
  if (result.changes === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Tag not assigned to this task');
  }
}

export function getTagsForTask(userId: string, taskId: string): Tag[] {
  const db = getDb();
  return db.prepare(`
    SELECT t.* FROM tags t
    JOIN task_tags tt ON t.id = tt.tag_id
    WHERE tt.task_id = ? AND t.user_id = ?
    ORDER BY t.name ASC
  `).all(taskId, userId) as Tag[];
}
