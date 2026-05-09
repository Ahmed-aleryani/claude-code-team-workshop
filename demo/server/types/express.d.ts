import type { User } from '../../shared/types.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export {};
