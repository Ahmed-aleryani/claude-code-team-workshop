import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Must be a valid email address')
  .max(254);

export const newPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

export const registerSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const todoTitleSchema = z
  .string()
  .trim()
  .min(1, 'Title cannot be empty')
  .max(500, 'Title must be at most 500 characters');

export const dueAtSchema = z
  .string()
  .datetime({ message: 'dueAt must be an ISO 8601 datetime with a Z designator' })
  .nullable()
  .optional();

export const createTodoSchema = z.object({
  title: todoTitleSchema,
  dueAt: dueAtSchema,
});

export const updateTodoSchema = z
  .object({
    title: todoTitleSchema.optional(),
    completed: z.boolean().optional(),
    dueAt: dueAtSchema,
  })
  .refine(
    (d) =>
      d.title !== undefined || d.completed !== undefined || d.dueAt !== undefined,
    { message: 'At least one of title, completed, or dueAt is required' },
  );

export const listTodosQuerySchema = z.object({
  sort: z.enum(['createdAt-desc', 'dueAt-asc']).optional(),
  from: z.string().datetime({ message: 'from must be ISO 8601 with Z' }).optional(),
  to: z.string().datetime({ message: 'to must be ISO 8601 with Z' }).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
export type ListTodosQueryInput = z.infer<typeof listTodosQuerySchema>;
