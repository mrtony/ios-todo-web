import { v4 as uuid } from 'uuid';
import { getDb, withTransaction } from '../db/connection.js';
import { AppError } from '../middleware/error-handler.js';
import type { List } from '../types.js';

export async function getAll(userId: string): Promise<List[]> {
  const db = getDb();
  const result = await db.query<List>('SELECT * FROM lists WHERE user_id = $1 ORDER BY sort_order ASC', [userId]);
  return result.rows;
}

export async function getById(userId: string, listId: string): Promise<List> {
  const db = getDb();
  const result = await db.query<List>('SELECT * FROM lists WHERE id = $1 AND user_id = $2', [listId, userId]);
  const list = result.rows[0];

  if (!list) {
    throw new AppError(404, 'NOT_FOUND', 'List not found');
  }

  return list;
}

export async function create(
  userId: string,
  data: { name: string; color?: string; icon?: string },
): Promise<List> {
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();
  const maxOrder = await db.query<{ max: number | null }>('SELECT MAX(sort_order) AS max FROM lists WHERE user_id = $1', [userId]);
  const sortOrder = (maxOrder.rows[0]?.max ?? -1) + 1;

  try {
    await db.query(
      'INSERT INTO lists (id, user_id, name, color, icon, sort_order, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, userId, data.name, data.color || '#3b82f6', data.icon || 'list', sortOrder, now, now],
    );
  } catch (err: any) {
    if (err.code === '23505') {
      throw new AppError(409, 'CONFLICT', 'A list with this name already exists');
    }

    throw err;
  }

  return getById(userId, id);
}

export async function update(
  userId: string,
  listId: string,
  data: { name?: string; color?: string; icon?: string },
): Promise<List> {
  const db = getDb();
  const existing = await getById(userId, listId);
  const now = new Date().toISOString();

  try {
    await db.query(
      'UPDATE lists SET name = $1, color = $2, icon = $3, updated_at = $4 WHERE id = $5 AND user_id = $6',
      [data.name ?? existing.name, data.color ?? existing.color, data.icon ?? existing.icon, now, listId, userId],
    );
  } catch (err: any) {
    if (err.code === '23505') {
      throw new AppError(409, 'CONFLICT', 'A list with this name already exists');
    }

    throw err;
  }

  return getById(userId, listId);
}

export async function remove(userId: string, listId: string): Promise<void> {
  const db = getDb();
  const result = await db.query('DELETE FROM lists WHERE id = $1 AND user_id = $2', [listId, userId]);

  if (result.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'List not found');
  }
}

export async function reorder(userId: string, orderedIds: string[]): Promise<void> {
  const now = new Date().toISOString();

  await withTransaction(async (client) => {
    for (const [index, id] of orderedIds.entries()) {
      await client.query(
        'UPDATE lists SET sort_order = $1, updated_at = $2 WHERE id = $3 AND user_id = $4',
        [index, now, id, userId],
      );
    }
  });
}
