import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';
import type { ApiError } from '../../shared/types.js';

export function formatZodDetails(err: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    const list = details[key] ?? [];
    list.push(issue.message);
    details[key] = list;
  }
  return details;
}

export function validate<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const body: ApiError = {
        error: 'Validation failed',
        details: formatZodDetails(result.error),
      };
      res.status(400).json(body);
      return;
    }
    req.body = result.data;
    next();
  };
}
