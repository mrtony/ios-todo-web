import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error-handler.js';
import type { List } from '../types.js';

export function getAll(userId: string): List[] {
  const db = getDb();
  return db.prepare('SELECT * FROM lists WHERE user_id = ? ORDER BY sort_order ASC').all(userId) as List[];
}

export function getById(userId: string, listId: string): List {
  const db = getDb();
  const list = db.prepare('SELECT * FROM lists WHERE id = ? AND user_id = ?').get(listId, userId) as List | undefined;

  if (!list) {
    throw new AppError(404, 'NOT_FOUND', 'List not found');
  }

  return list;
}

export function create(userId: string, data: { name: string; color?: string; icon?: string }): List {
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();
  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM lists WHERE user_id = ?').get(userId) as {
    max: number | null;
  };
  const sortOrder = (maxOrder.max ?? -1) + 1;

  try {
    db.prepare(`
      INSERT INTO lists (id, user_id, name, color, icon, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, data.name, data.color || '#3b82f6', data.icon || 'list', sortOrder, now, now);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      throw new AppError(409, 'CONFLICT', 'A list with this name already exists');
    }

    throw err;
  }

  return getById(userId, id);
}

export function update(
  userId: string,
  listId: string,
  data: { name?: string; color?: string; icon?: string },
): List {
  const db = getDb();
  const existing = getById(userId, listId);
  const now = new Date().toISOString();

  try {
    db.prepare(`
      UPDATE lists SET name = ?, color = ?, icon = ?, updated_at = ? WHERE id = ? AND user_id = ?
    `).run(
      data.name ?? existing.name,
      data.color ?? existing.color,
      data.icon ?? existing.icon,
      now,
      listId,
      userId,
    );
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      throw new AppError(409, 'CONFLICT', 'A list with this name already exists');
    }

    throw err;
  }

  return getById(userId, listId);
}

export function remove(userId: string, listId: string): void {
  const db = getDb();
  const result = db.prepare('DELETE FROM lists WHERE id = ? AND user_id = ?').run(listId, userId);

  if (result.changes === 0) {
    throw new AppError(404, 'NOT_FOUND', 'List not found');
  }
}

export function reorder(userId: string, orderedIds: string[]): void {
  const db = getDb();
  const updateStmt = db.prepare('UPDATE lists SET sort_order = ?, updated_at = ? WHERE id = ? AND user_id = ?');
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    orderedIds.forEach((id, index) => {
      updateStmt.run(index, now, id, userId);
    });
  });

  transaction();
}
