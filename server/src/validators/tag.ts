import { z } from 'zod';

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

export const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  color: z.string().regex(hexColorRegex, 'Invalid hex color').optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(hexColorRegex, 'Invalid hex color').optional(),
});

export const addTaskTagSchema = z.object({
  tagId: z.string().min(1, 'Tag ID is required'),
});
