import { Router, type RequestHandler } from 'express';
import {
  createTodoSchema,
  listTodosQuerySchema,
  updateTodoSchema,
} from '../../shared/schemas.js';
import type {
  ApiError,
  CreateTodoRequest,
  ListTodosQuery,
  Todo,
  TodoListResponse,
  UpdateTodoRequest,
} from '../../shared/types.js';
import type { DB } from '../db/connection.js';
import { NotFoundError } from '../db/errors.js';
import { createTodo, deleteTodo, listTodos, updateTodo } from '../db/todos.js';
import { requireAuth } from '../middleware/require-auth.js';
import { formatZodDetails, validate } from '../middleware/validate.js';

function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function getUserId(req: Parameters<RequestHandler>[0]): string | null {
  return req.user?.id ?? null;
}

export function createTodosRouter(db: DB): Router {
  const router = Router();
  router.use(requireAuth(db));

  router.get(
    '/',
    asyncHandler((req, res) => {
      const userId = getUserId(req);
      if (!userId) {
        const body: ApiError = { error: 'Unauthorized' };
        res.status(401).json(body);
        return;
      }
      const parsed = listTodosQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        const body: ApiError = {
          error: 'Validation failed',
          details: formatZodDetails(parsed.error),
        };
        res.status(400).json(body);
        return;
      }
      const query: ListTodosQuery = parsed.data;
      const todos: TodoListResponse = listTodos(db, userId, query);
      res.status(200).json(todos);
    }),
  );

  router.post(
    '/',
    validate(createTodoSchema),
    asyncHandler((req, res) => {
      const userId = getUserId(req);
      if (!userId) {
        const body: ApiError = { error: 'Unauthorized' };
        res.status(401).json(body);
        return;
      }
      const { title, dueAt } = req.body as CreateTodoRequest;
      const todo: Todo = createTodo(db, { userId, title, dueAt });
      res.status(201).json(todo);
    }),
  );

  router.patch(
    '/:id',
    validate(updateTodoSchema),
    asyncHandler((req, res) => {
      const userId = getUserId(req);
      if (!userId) {
        const body: ApiError = { error: 'Unauthorized' };
        res.status(401).json(body);
        return;
      }
      const id = req.params.id;
      const body = req.body as UpdateTodoRequest;
      const patch: {
        title?: string;
        completed?: boolean;
        dueAt?: string | null;
      } = {};
      if (body.title !== undefined) patch.title = body.title;
      if (body.completed !== undefined) patch.completed = body.completed;
      if ('dueAt' in body) patch.dueAt = body.dueAt ?? null;
      try {
        const todo: Todo = updateTodo(db, { id, userId, patch });
        res.status(200).json(todo);
      } catch (err) {
        if (err instanceof NotFoundError) {
          const body: ApiError = { error: 'Todo not found' };
          res.status(404).json(body);
          return;
        }
        throw err;
      }
    }),
  );

  router.delete(
    '/:id',
    asyncHandler((req, res) => {
      const userId = getUserId(req);
      if (!userId) {
        const body: ApiError = { error: 'Unauthorized' };
        res.status(401).json(body);
        return;
      }
      const id = req.params.id;
      try {
        deleteTodo(db, { id, userId });
        res.status(204).end();
      } catch (err) {
        if (err instanceof NotFoundError) {
          const body: ApiError = { error: 'Todo not found' };
          res.status(404).json(body);
          return;
        }
        throw err;
      }
    }),
  );

  return router;
}
