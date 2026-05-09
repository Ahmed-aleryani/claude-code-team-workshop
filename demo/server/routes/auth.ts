import bcrypt from 'bcrypt';
import { Router, type RequestHandler } from 'express';
import { loginSchema, registerSchema } from '../../shared/schemas.js';
import type { ApiError, AuthResponse, LoginRequest, RegisterRequest } from '../../shared/types.js';
import { clearAuthCookie, setAuthCookie } from '../auth/cookie.js';
import { signToken } from '../auth/jwt.js';
import { BCRYPT_COST, hashPassword, verifyPassword } from '../auth/password.js';
import type { DB } from '../db/connection.js';
import { ConflictError } from '../db/errors.js';
import { createUser, findUserByEmailWithHash } from '../db/users.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';

const INVALID_CREDENTIALS: ApiError = { error: 'Invalid email or password' };

const DUMMY_HASH = bcrypt.hashSync('dummy-for-timing-safety', BCRYPT_COST);

function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function createAuthRouter(db: DB): Router {
  const router = Router();

  router.post(
    '/register',
    validate(registerSchema),
    asyncHandler(async (req, res) => {
      const { email, password } = req.body as RegisterRequest;
      const passwordHash = await hashPassword(password);
      try {
        const user = createUser(db, { email, passwordHash });
        const token = signToken({ userId: user.id });
        setAuthCookie(res, token);
        const body: AuthResponse = { user };
        res.status(201).json(body);
      } catch (err) {
        if (err instanceof ConflictError) {
          const body: ApiError = { error: 'Email already in use' };
          res.status(409).json(body);
          return;
        }
        throw err;
      }
    }),
  );

  router.post(
    '/login',
    validate(loginSchema),
    asyncHandler(async (req, res) => {
      const { email, password } = req.body as LoginRequest;
      const record = findUserByEmailWithHash(db, email);
      let valid = false;
      if (record) {
        valid = await verifyPassword(password, record.passwordHash);
      } else {
        await verifyPassword(password, DUMMY_HASH);
      }
      if (!record || !valid) {
        res.status(401).json(INVALID_CREDENTIALS);
        return;
      }
      const user = { id: record.id, email: record.email, createdAt: record.createdAt };
      const token = signToken({ userId: user.id });
      setAuthCookie(res, token);
      const body: AuthResponse = { user };
      res.status(200).json(body);
    }),
  );

  router.post('/logout', (_req, res) => {
    clearAuthCookie(res);
    res.status(204).end();
  });

  router.get('/me', requireAuth(db), (req, res) => {
    const user = req.user;
    if (!user) {
      const body: ApiError = { error: 'Unauthorized' };
      res.status(401).json(body);
      return;
    }
    const body: AuthResponse = { user };
    res.status(200).json(body);
  });

  return router;
}
