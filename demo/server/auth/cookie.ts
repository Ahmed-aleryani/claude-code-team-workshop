import type { Response } from 'express';

export const AUTH_COOKIE_NAME = 'auth_token';

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd(),
    path: '/',
    maxAge: MAX_AGE_MS,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd(),
    path: '/',
  });
}
