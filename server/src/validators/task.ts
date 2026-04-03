import { z } from 'zod';

const recurrenceSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().int().min(1).max(365),
  days: z.array(z.number().int().min(0).max(6)).optional(),
}).strict();

const recurrenceField = z.union([
  z.string().transform((value, ctx) => {
    try {
      const parsed = JSON.parse(value);
      const result = recurrenceSchema.safeParse(parsed);
      if (!result.success) {
        ctx.addIssue({ code: 'custom', message: 'Invalid recurrence format' });
        return z.NEVER;
      }
      return value;
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
      return z.NEVER;
    }
  }),
  z.null(),
]).optional();

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  notes: z.string().max(5000).optional(),
  due_date: z.string().datetime().nullable().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  flagged: z.boolean().optional(),
  recurrence: recurrenceField,
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  notes: z.string().max(5000).optional(),
  due_date: z.string().datetime().nullable().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  flagged: z.boolean().optional(),
  recurrence: recurrenceField,
  list_id: z.string().optional(),
});

export const reorderTasksSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});
