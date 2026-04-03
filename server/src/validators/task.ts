import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  notes: z.string().max(5000).optional(),
  due_date: z.string().datetime().nullable().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  flagged: z.boolean().optional(),
  recurrence: z.string().max(500).nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  notes: z.string().max(5000).optional(),
  due_date: z.string().datetime().nullable().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  flagged: z.boolean().optional(),
  recurrence: z.string().max(500).nullable().optional(),
  list_id: z.string().optional(),
});

export const reorderTasksSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});
