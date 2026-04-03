import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error-handler.js';
import type { Task } from '../types.js';

interface Recurrence {
  type: 'daily' | 'weekly' | 'monthly';
  interval: number;
  days?: number[];
}

function parseRecurrence(json: string | null): Recurrence | null {
  if (!json) {
    return null;
  }

  try {
    return JSON.parse(json) as Recurrence;
  } catch {
    return null;
  }
}

function getNextDueDate(currentDue: string, recurrence: Recurrence): string {
  const date = new Date(currentDue);

  switch (recurrence.type) {
    case 'daily':
      date.setDate(date.getDate() + recurrence.interval);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7 * recurrence.interval);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + recurrence.interval);
      break;
  }

  return date.toISOString();
}

function verifyListOwnership(userId: string, listId: string): void {
  const db = getDb();
  const list = db.prepare('SELECT id FROM lists WHERE id = ? AND user_id = ?').get(listId, userId);
  if (!list) {
    throw new AppError(404, 'NOT_FOUND', 'List not found');
  }
}

function verifyTaskOwnership(userId: string, taskId: string): Task {
  const db = getDb();
  const task = db.prepare(`
    SELECT t.* FROM tasks t
    JOIN lists l ON t.list_id = l.id
    WHERE t.id = ? AND l.user_id = ?
  `).get(taskId, userId) as Task | undefined;

  if (!task) {
    throw new AppError(404, 'NOT_FOUND', 'Task not found');
  }

  return task;
}

export function getByList(userId: string, listId: string): Task[] {
  verifyListOwnership(userId, listId);
  const db = getDb();
  return db.prepare(`
    SELECT * FROM tasks WHERE list_id = ? AND parent_id IS NULL ORDER BY sort_order ASC
  `).all(listId) as Task[];
}

export function getAllForUser(userId: string): Task[] {
  const db = getDb();
  return db.prepare(`
    SELECT t.* FROM tasks t
    JOIN lists l ON t.list_id = l.id
    WHERE l.user_id = ? AND t.parent_id IS NULL
  `).all(userId) as Task[];
}

export function create(
  userId: string,
  listId: string,
  data: {
    title: string;
    notes?: string;
    due_date?: string | null;
    priority?: number;
    flagged?: boolean;
    recurrence?: string | null;
  },
): Task {
  verifyListOwnership(userId, listId);
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();
  const maxOrder = db.prepare(
    'SELECT MAX(sort_order) as max FROM tasks WHERE list_id = ? AND parent_id IS NULL',
  ).get(listId) as { max: number | null };
  const sortOrder = (maxOrder.max ?? -1) + 1;

  db.prepare(`
    INSERT INTO tasks (id, list_id, title, notes, due_date, priority, flagged, recurrence, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    listId,
    data.title,
    data.notes || '',
    data.due_date || null,
    data.priority ?? 0,
    data.flagged ? 1 : 0,
    data.recurrence || null,
    sortOrder,
    now,
    now,
  );

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
}

export function update(
  userId: string,
  taskId: string,
  data: {
    title?: string;
    notes?: string;
    due_date?: string | null;
    priority?: number;
    flagged?: boolean;
    recurrence?: string | null;
    list_id?: string;
  },
): Task {
  const existing = verifyTaskOwnership(userId, taskId);

  if (data.list_id && data.list_id !== existing.list_id) {
    verifyListOwnership(userId, data.list_id);
    if (existing.parent_id) {
      throw new AppError(400, 'INVALID_OPERATION', 'Cannot move a subtask to a different list');
    }
  }

  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE tasks SET
      title = ?, notes = ?, due_date = ?, priority = ?, flagged = ?,
      recurrence = ?, list_id = ?, updated_at = ?
    WHERE id = ?
  `).run(
    data.title ?? existing.title,
    data.notes ?? existing.notes,
    data.due_date !== undefined ? data.due_date : existing.due_date,
    data.priority ?? existing.priority,
    data.flagged !== undefined ? (data.flagged ? 1 : 0) : existing.flagged,
    data.recurrence !== undefined ? data.recurrence : existing.recurrence,
    data.list_id ?? existing.list_id,
    now,
    taskId,
  );

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task;
}

export function remove(userId: string, taskId: string): void {
  verifyTaskOwnership(userId, taskId);
  const db = getDb();
  db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
}

export function complete(userId: string, taskId: string): Task {
  const task = verifyTaskOwnership(userId, taskId);
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE tasks SET completed_at = ?, updated_at = ? WHERE id = ?').run(now, now, taskId);

  const recurrence = parseRecurrence(task.recurrence);
  if (recurrence && task.due_date) {
    const nextDueDate = getNextDueDate(task.due_date, recurrence);
    const nextId = uuid();
    const maxOrder = db.prepare(
      'SELECT MAX(sort_order) as max FROM tasks WHERE list_id = ? AND parent_id IS NULL',
    ).get(task.list_id) as { max: number | null };
    const sortOrder = (maxOrder.max ?? -1) + 1;

    db.prepare(`
      INSERT INTO tasks (id, list_id, parent_id, title, notes, due_date, priority, flagged, recurrence, sort_order, created_at, updated_at)
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nextId,
      task.list_id,
      task.title,
      task.notes,
      nextDueDate,
      task.priority,
      task.flagged,
      task.recurrence,
      sortOrder,
      now,
      now,
    );
  }

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task;
}

export function uncomplete(userId: string, taskId: string): Task {
  verifyTaskOwnership(userId, taskId);
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE tasks SET completed_at = NULL, updated_at = ? WHERE id = ?').run(now, taskId);
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task;
}

export function reorder(userId: string, listId: string, orderedIds: string[]): void {
  verifyListOwnership(userId, listId);
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ? AND list_id = ?');

  const transaction = db.transaction(() => {
    orderedIds.forEach((id, index) => {
      stmt.run(index, now, id, listId);
    });
  });
  transaction();
}

export function getSubtasks(userId: string, parentId: string): Task[] {
  verifyTaskOwnership(userId, parentId);
  const db = getDb();
  return db.prepare('SELECT * FROM tasks WHERE parent_id = ? ORDER BY sort_order ASC').all(parentId) as Task[];
}

export function createSubtask(
  userId: string,
  parentId: string,
  data: {
    title: string;
    notes?: string;
    due_date?: string | null;
    priority?: number;
    flagged?: boolean;
  },
): Task {
  const parent = verifyTaskOwnership(userId, parentId);

  if (parent.parent_id) {
    throw new AppError(400, 'INVALID_OPERATION', 'Cannot create subtask of a subtask (only one level allowed)');
  }

  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();
  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM tasks WHERE parent_id = ?').get(parentId) as {
    max: number | null;
  };
  const sortOrder = (maxOrder.max ?? -1) + 1;

  db.prepare(`
    INSERT INTO tasks (id, list_id, parent_id, title, notes, due_date, priority, flagged, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    parent.list_id,
    parentId,
    data.title,
    data.notes || '',
    data.due_date || null,
    data.priority ?? 0,
    data.flagged ? 1 : 0,
    sortOrder,
    now,
    now,
  );

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
}
