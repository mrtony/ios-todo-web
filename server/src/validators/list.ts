import { z } from 'zod';

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
const VALID_ICONS = ['list', 'cart', 'home', 'briefcase', 'heart', 'star', 'flag', 'bookmark'] as const;

export const createListSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  color: z.string().regex(hexColorRegex, 'Invalid hex color').optional(),
  icon: z.enum(VALID_ICONS).optional(),
});

export const updateListSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(hexColorRegex, 'Invalid hex color').optional(),
  icon: z.enum(VALID_ICONS).optional(),
});

export const reorderListsSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});
