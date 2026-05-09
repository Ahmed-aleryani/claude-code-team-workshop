import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ApiError } from '../../shared/types.js';
import { AUTH_COOKIE_NAME } from '../auth/cookie.js';
import { verifyToken } from '../auth/jwt.js';
import type { DB } from '../db/connection.js';
import { findUserById } from '../db/users.js';

const UNAUTHORIZED: ApiError = { error: 'Unauthorized' };

export function requireAuth(db: DB): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const token = cookies?.[AUTH_COOKIE_NAME];
    if (!token) {
      res.status(401).json(UNAUTHORIZED);
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json(UNAUTHORIZED);
      return;
    }

    const user = findUserById(db, payload.userId);
    if (!user) {
      res.status(401).json(UNAUTHORIZED);
      return;
    }

    req.user = user;
    next();
  };
}
