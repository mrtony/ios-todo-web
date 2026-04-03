import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error-handler.js';
import type { Tag } from '../types.js';

export async function getAll(userId: string): Promise<Tag[]> {
  const db = getDb();
  const result = await db.query<Tag>('SELECT * FROM tags WHERE user_id = $1 ORDER BY name ASC', [userId]);
  return result.rows;
}

export async function create(userId: string, data: { name: string; color?: string }): Promise<Tag> {
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();

  try {
    await db.query(
      'INSERT INTO tags (id, user_id, name, color, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, userId, data.name, data.color || '#6b7280', now, now],
    );
  } catch (err: any) {
    if (err.code === '23505') {
      throw new AppError(409, 'CONFLICT', 'A tag with this name already exists');
    }

    throw err;
  }

  const result = await db.query<Tag>('SELECT * FROM tags WHERE id = $1', [id]);
  return result.rows[0]!;
}

export async function update(
  userId: string,
  tagId: string,
  data: { name?: string; color?: string },
): Promise<Tag> {
  const db = getDb();
  const existingResult = await db.query<Tag>('SELECT * FROM tags WHERE id = $1 AND user_id = $2', [tagId, userId]);
  const existing = existingResult.rows[0];

  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Tag not found');
  }

  const now = new Date().toISOString();

  try {
    await db.query('UPDATE tags SET name = $1, color = $2, updated_at = $3 WHERE id = $4', [
      data.name ?? existing.name,
      data.color ?? existing.color,
      now,
      tagId,
    ]);
  } catch (err: any) {
    if (err.code === '23505') {
      throw new AppError(409, 'CONFLICT', 'A tag with this name already exists');
    }

    throw err;
  }

  const result = await db.query<Tag>('SELECT * FROM tags WHERE id = $1', [tagId]);
  return result.rows[0]!;
}

export async function remove(userId: string, tagId: string): Promise<void> {
  const db = getDb();
  const result = await db.query('DELETE FROM tags WHERE id = $1 AND user_id = $2', [tagId, userId]);

  if (result.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Tag not found');
  }
}

export async function addTagToTask(userId: string, taskId: string, tagId: string): Promise<void> {
  const db = getDb();

  const task = await db.query(
    `
      SELECT t.id FROM tasks t
      JOIN lists l ON t.list_id = l.id
      WHERE t.id = $1 AND l.user_id = $2
    `,
    [taskId, userId],
  );
  if (!task.rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Task not found');
  }

  const tag = await db.query('SELECT id FROM tags WHERE id = $1 AND user_id = $2', [tagId, userId]);
  if (!tag.rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Tag not found');
  }

  try {
    await db.query('INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)', [taskId, tagId]);
  } catch (err: any) {
    if (err.code === '23505') {
      throw new AppError(409, 'CONFLICT', 'Tag already assigned to this task');
    }

    throw err;
  }
}

export async function removeTagFromTask(userId: string, taskId: string, tagId: string): Promise<void> {
  const db = getDb();

  const task = await db.query(
    `
      SELECT t.id FROM tasks t
      JOIN lists l ON t.list_id = l.id
      WHERE t.id = $1 AND l.user_id = $2
    `,
    [taskId, userId],
  );
  if (!task.rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Task not found');
  }

  const result = await db.query('DELETE FROM task_tags WHERE task_id = $1 AND tag_id = $2', [taskId, tagId]);
  if (result.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Tag not assigned to this task');
  }
}

export async function getTagsForTask(userId: string, taskId: string): Promise<Tag[]> {
  const db = getDb();
  const result = await db.query<Tag>(
    `
      SELECT t.* FROM tags t
      JOIN task_tags tt ON t.id = tt.tag_id
      WHERE tt.task_id = $1 AND t.user_id = $2
      ORDER BY t.name ASC
    `,
    [taskId, userId],
  );
  return result.rows;
}
