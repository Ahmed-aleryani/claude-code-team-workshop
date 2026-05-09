import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import type { ApiError } from '../../shared/types.js';
import { ConflictError, NotFoundError } from '../db/errors.js';

function formatZodDetails(err: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    const list = details[key] ?? [];
    list.push(issue.message);
    details[key] = list;
  }
  return details;
}

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ZodError) {
    const body: ApiError = {
      error: 'Validation failed',
      details: formatZodDetails(err),
    };
    res.status(400).json(body);
    return;
  }

  if (err instanceof NotFoundError) {
    const body: ApiError = { error: err.message };
    res.status(404).json(body);
    return;
  }

  if (err instanceof ConflictError) {
    const body: ApiError = { error: err.message };
    res.status(409).json(body);
    return;
  }

  const body: ApiError = { error: 'Internal server error' };
  res.status(500).json(body);
};
