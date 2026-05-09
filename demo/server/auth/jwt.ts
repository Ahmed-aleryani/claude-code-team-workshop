import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const SECRET_VALUE: string = SECRET;

const EXPIRES_IN = '7d';

export interface TokenPayload {
  userId: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign({ userId: payload.userId }, SECRET_VALUE, {
    expiresIn: EXPIRES_IN,
    algorithm: 'HS256',
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET_VALUE, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') return null;
    const userId = decoded.userId;
    if (typeof userId !== 'string' || userId.length === 0) {
      return null;
    }
    return { userId };
  } catch {
    return null;
  }
}
