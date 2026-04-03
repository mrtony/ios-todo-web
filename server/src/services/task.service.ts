import { v4 as uuid } from 'uuid';
import { getDb, withTransaction } from '../db/connection.js';
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
      if (recurrence.days && recurrence.days.length > 0) {
        const currentDay = date.getDay();
        const sortedDays = [...recurrence.days].sort((a, b) => a - b);
        const nextDay = sortedDays.find((day) => day > currentDay);

        if (nextDay !== undefined) {
          date.setDate(date.getDate() + (nextDay - currentDay));
        } else {
          const daysUntilNextWeek = 7 - currentDay + sortedDays[0];
          date.setDate(date.getDate() + daysUntilNextWeek + 7 * (recurrence.interval - 1));
        }
      } else {
        date.setDate(date.getDate() + 7 * recurrence.interval);
      }
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + recurrence.interval);
      break;
  }

  return date.toISOString();
}

async function verifyListOwnership(userId: string, listId: string): Promise<void> {
  const db = getDb();
  const result = await db.query('SELECT id FROM lists WHERE id = $1 AND user_id = $2', [listId, userId]);

  if (!result.rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'List not found');
  }
}

async function verifyTaskOwnership(userId: string, taskId: string): Promise<Task> {
  const db = getDb();
  const result = await db.query<Task>(
    `
      SELECT t.* FROM tasks t
      JOIN lists l ON t.list_id = l.id
      WHERE t.id = $1 AND l.user_id = $2
    `,
    [taskId, userId],
  );
  const task = result.rows[0];

  if (!task) {
    throw new AppError(404, 'NOT_FOUND', 'Task not found');
  }

  return task;
}

export async function getByList(userId: string, listId: string): Promise<Task[]> {
  await verifyListOwnership(userId, listId);
  const db = getDb();
  const result = await db.query<Task>(
    'SELECT * FROM tasks WHERE list_id = $1 AND parent_id IS NULL ORDER BY sort_order ASC',
    [listId],
  );
  return result.rows;
}

export async function getByListWithSubtasks(
  userId: string,
  listId: string,
): Promise<{
  tasks: (Task & { tags: { name: string; color: string }[] })[];
  subtasks: Record<string, (Task & { tags: { name: string; color: string }[] })[]>;
}> {
  await verifyListOwnership(userId, listId);
  const db = getDb();

  const allTasksResult = await db.query<Task>('SELECT * FROM tasks WHERE list_id = $1 ORDER BY sort_order ASC', [listId]);
  const allTasks = allTasksResult.rows;
  const taskIds = allTasks.map((task) => task.id);
  const tagMap: Record<string, { name: string; color: string }[]> = {};

  if (taskIds.length > 0) {
    const placeholders = taskIds.map((_, index) => `$${index + 1}`).join(',');
    const tagRows = await db.query<{ task_id: string; name: string; color: string }>(
      `
        SELECT tt.task_id, t.name, t.color
        FROM task_tags tt
        JOIN tags t ON tt.tag_id = t.id
        WHERE tt.task_id IN (${placeholders})
        ORDER BY t.name ASC
      `,
      taskIds,
    );

    for (const row of tagRows.rows) {
      if (!tagMap[row.task_id]) {
        tagMap[row.task_id] = [];
      }

      tagMap[row.task_id].push({ name: row.name, color: row.color });
    }
  }

  const tasks: (Task & { tags: { name: string; color: string }[] })[] = [];
  const subtasks: Record<string, (Task & { tags: { name: string; color: string }[] })[]> = {};

  for (const task of allTasks) {
    const enriched = { ...task, tags: tagMap[task.id] || [] };

    if (task.parent_id === null) {
      tasks.push(enriched);
    } else {
      if (!subtasks[task.parent_id]) {
        subtasks[task.parent_id] = [];
      }

      subtasks[task.parent_id].push(enriched);
    }
  }

  return { tasks, subtasks };
}

export async function getAllForUser(userId: string): Promise<Task[]> {
  const db = getDb();
  const result = await db.query<Task>(
    `
      SELECT t.* FROM tasks t
      JOIN lists l ON t.list_id = l.id
      WHERE l.user_id = $1 AND t.parent_id IS NULL
    `,
    [userId],
  );
  return result.rows;
}

export async function create(
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
): Promise<Task> {
  await verifyListOwnership(userId, listId);
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();
  const maxOrder = await db.query<{ max: number | null }>(
    'SELECT MAX(sort_order) AS max FROM tasks WHERE list_id = $1 AND parent_id IS NULL',
    [listId],
  );
  const sortOrder = (maxOrder.rows[0]?.max ?? -1) + 1;

  await db.query(
    `
      INSERT INTO tasks (id, list_id, title, notes, due_date, priority, flagged, recurrence, sort_order, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
    [
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
    ],
  );

  const result = await db.query<Task>('SELECT * FROM tasks WHERE id = $1', [id]);
  return result.rows[0]!;
}

export async function update(
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
): Promise<Task> {
  const existing = await verifyTaskOwnership(userId, taskId);

  if (data.list_id && data.list_id !== existing.list_id) {
    await verifyListOwnership(userId, data.list_id);
    if (existing.parent_id) {
      throw new AppError(400, 'INVALID_OPERATION', 'Cannot move a subtask to a different list');
    }
  }

  const db = getDb();
  const now = new Date().toISOString();

  await db.query(
    `
      UPDATE tasks SET
        title = $1,
        notes = $2,
        due_date = $3,
        priority = $4,
        flagged = $5,
        recurrence = $6,
        list_id = $7,
        updated_at = $8
      WHERE id = $9
    `,
    [
      data.title ?? existing.title,
      data.notes ?? existing.notes,
      data.due_date !== undefined ? data.due_date : existing.due_date,
      data.priority ?? existing.priority,
      data.flagged !== undefined ? (data.flagged ? 1 : 0) : existing.flagged,
      data.recurrence !== undefined ? data.recurrence : existing.recurrence,
      data.list_id ?? existing.list_id,
      now,
      taskId,
    ],
  );

  const result = await db.query<Task>('SELECT * FROM tasks WHERE id = $1', [taskId]);
  return result.rows[0]!;
}

export async function remove(userId: string, taskId: string): Promise<void> {
  await verifyTaskOwnership(userId, taskId);
  const db = getDb();
  await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);
}

export async function complete(userId: string, taskId: string): Promise<Task> {
  const task = await verifyTaskOwnership(userId, taskId);
  const db = getDb();
  const now = new Date().toISOString();

  await db.query('UPDATE tasks SET completed_at = $1, updated_at = $2 WHERE id = $3', [now, now, taskId]);

  const recurrence = parseRecurrence(task.recurrence);
  if (recurrence && task.due_date) {
    const nextDueDate = getNextDueDate(task.due_date, recurrence);
    const nextId = uuid();
    const maxOrder = await db.query<{ max: number | null }>(
      'SELECT MAX(sort_order) AS max FROM tasks WHERE list_id = $1 AND parent_id IS NULL',
      [task.list_id],
    );
    const sortOrder = (maxOrder.rows[0]?.max ?? -1) + 1;

    await db.query(
      `
        INSERT INTO tasks (id, list_id, parent_id, title, notes, due_date, priority, flagged, recurrence, sort_order, created_at, updated_at)
        VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
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
      ],
    );
  }

  const result = await db.query<Task>('SELECT * FROM tasks WHERE id = $1', [taskId]);
  return result.rows[0]!;
}

export async function uncomplete(userId: string, taskId: string): Promise<Task> {
  await verifyTaskOwnership(userId, taskId);
  const db = getDb();
  const now = new Date().toISOString();
  await db.query('UPDATE tasks SET completed_at = NULL, updated_at = $1 WHERE id = $2', [now, taskId]);
  const result = await db.query<Task>('SELECT * FROM tasks WHERE id = $1', [taskId]);
  return result.rows[0]!;
}

export async function reorder(userId: string, listId: string, orderedIds: string[]): Promise<void> {
  await verifyListOwnership(userId, listId);
  const now = new Date().toISOString();

  await withTransaction(async (client) => {
    for (const [index, id] of orderedIds.entries()) {
      await client.query('UPDATE tasks SET sort_order = $1, updated_at = $2 WHERE id = $3 AND list_id = $4', [
        index,
        now,
        id,
        listId,
      ]);
    }
  });
}

export async function getSubtasks(userId: string, parentId: string): Promise<Task[]> {
  await verifyTaskOwnership(userId, parentId);
  const db = getDb();
  const result = await db.query<Task>('SELECT * FROM tasks WHERE parent_id = $1 ORDER BY sort_order ASC', [parentId]);
  return result.rows;
}

export async function createSubtask(
  userId: string,
  parentId: string,
  data: {
    title: string;
    notes?: string;
    due_date?: string | null;
    priority?: number;
    flagged?: boolean;
  },
): Promise<Task> {
  const parent = await verifyTaskOwnership(userId, parentId);

  if (parent.parent_id) {
    throw new AppError(400, 'INVALID_OPERATION', 'Cannot create subtask of a subtask (only one level allowed)');
  }

  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();
  const maxOrder = await db.query<{ max: number | null }>('SELECT MAX(sort_order) AS max FROM tasks WHERE parent_id = $1', [
    parentId,
  ]);
  const sortOrder = (maxOrder.rows[0]?.max ?? -1) + 1;

  await db.query(
    `
      INSERT INTO tasks (id, list_id, parent_id, title, notes, due_date, priority, flagged, sort_order, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
    [
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
    ],
  );

  const result = await db.query<Task>('SELECT * FROM tasks WHERE id = $1', [id]);
  return result.rows[0]!;
}
